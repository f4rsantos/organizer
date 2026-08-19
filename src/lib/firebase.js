import { initializeApp, getApps, deleteApp } from 'firebase/app'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'
import {
  loadKeyString, encryptForSlot, decryptForSlot, isEnvelope, assertKeyExpected,
  aadForPersonalSlice, WHOLE_STATE, getCachedDek, hasAnySlot,
  isContainer, isEncryptedContainer, encodeSlices, decodeSlices, stripTransient,
  MODE_SYNC, loadLocalWraps,
} from './crypto'
import { readDevicePref, writeDevicePref } from './devicePrefs'

export { loadFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig } from './firebaseConfig'

const DOC_PATH = { collection: 'organizer', id: 'state' }
const PERSONAL_AAD = aadForPersonalSlice(WHOLE_STATE)
const COLLAB_RULES_PREF = 'collabRules'
const COLLAB_GUIDE_SEEN_PREF = 'collabGuideSeen'
const ANON_AUTH_FAIL_PREF = 'anonAuthFail'
const ANON_AUTH_STATUS = new Map()
const ANON_AUTH_PENDING = new Map()
const ANON_AUTH_FAIL_COOLDOWN_MS = 10 * 60 * 1000

export function loadCollabRulesTag() {
  return readDevicePref(COLLAB_RULES_PREF) === true ? 1 : 0
}

export function markCollabRulesEnabled() {
  writeDevicePref(COLLAB_RULES_PREF, true)
}

export function hasSeenCollabGuide() {
  return readDevicePref(COLLAB_GUIDE_SEEN_PREF) === true
}

export function markCollabGuideSeen() {
  writeDevicePref(COLLAB_GUIDE_SEEN_PREF, true)
}

function getApp(config) {
  const existingDefault = getApps().find(app => app.name === '[DEFAULT]')
  if (existingDefault) return existingDefault
  return initializeApp(config)
}

function stateDoc(db) {
  return doc(db, DOC_PATH.collection, DOC_PATH.id)
}

function shouldUseCollabRulesMode() {
  return loadCollabRulesTag() === 1
}

function isLikelyAuthRulesError(error) {
  const code = String(error?.code ?? '').toLowerCase()
  if (!code) return false
  return code.includes('permission-denied') || code.includes('unauthenticated')
}

function getProjectIdFromApp(app) {
  return String(app?.options?.projectId ?? '')
}

function readAnonFailCache() {
  const cache = readDevicePref(ANON_AUTH_FAIL_PREF)
  return cache && typeof cache === 'object' ? cache : {}
}

function writeAnonFailCache(cache) {
  writeDevicePref(ANON_AUTH_FAIL_PREF, cache)
}

function isAnonAuthCooldownActive(app) {
  const projectId = getProjectIdFromApp(app)
  if (!projectId) return false
  const cache = readAnonFailCache()
  const ts = Number(cache[projectId])
  if (!Number.isFinite(ts)) return false
  return Date.now() - ts < ANON_AUTH_FAIL_COOLDOWN_MS
}

function markAnonAuthFailure(app) {
  const projectId = getProjectIdFromApp(app)
  if (!projectId) return
  const cache = readAnonFailCache()
  cache[projectId] = Date.now()
  writeAnonFailCache(cache)
}

function clearAnonAuthFailure(app) {
  const projectId = getProjectIdFromApp(app)
  if (!projectId) return
  const cache = readAnonFailCache()
  if (!(projectId in cache)) return
  delete cache[projectId]
  writeAnonFailCache(cache)
}

async function trySignInAnonymously(app) {
  const status = ANON_AUTH_STATUS.get(app.name)
  if (status === 'failed') return false
  if (status === 'ok') return true
  if (isAnonAuthCooldownActive(app)) {
    ANON_AUTH_STATUS.set(app.name, 'failed')
    return false
  }

  const auth = getAuth(app)
  if (auth.currentUser) {
    ANON_AUTH_STATUS.set(app.name, 'ok')
    clearAnonAuthFailure(app)
    return true
  }

  if (ANON_AUTH_PENDING.has(app.name)) {
    return ANON_AUTH_PENDING.get(app.name)
  }

  const pending = (async () => {
    try {
      await signInAnonymously(auth)
      ANON_AUTH_STATUS.set(app.name, 'ok')
      clearAnonAuthFailure(app)
      return true
    } catch {
      ANON_AUTH_STATUS.set(app.name, 'failed')
      markAnonAuthFailure(app)
      return false
    } finally {
      ANON_AUTH_PENDING.delete(app.name)
    }
  })()

  ANON_AUTH_PENDING.set(app.name, pending)
  return pending
}

async function runSyncOperation(app, operation) {
  const collabRulesMode = shouldUseCollabRulesMode()

  if (collabRulesMode) {
    const signedIn = await trySignInAnonymously(app)
    if (!signedIn) {
      throw new Error('Anonymous auth required for collab rules mode')
    }

    return operation()
  }

  try {
    return await operation()
  } catch (error) {
    if (!isLikelyAuthRulesError(error)) throw error

    const signedIn = await trySignInAnonymously(app)
    if (!signedIn) throw error

    // Rules are auth-required on this project even if this device was never tagged before.
    markCollabRulesEnabled()
    return operation()
  }
}

async function readStateDoc(config) {
  const app = getApp(config)
  const db = getFirestore(app)
  const snap = await runSyncOperation(app, () => getDoc(stateDoc(db)))
  return snap.exists() ? snap.data() : null
}

async function writeStateDoc(config, payload) {
  const app = getApp(config)
  const db = getFirestore(app)
  await runSyncOperation(app, () => setDoc(stateDoc(db), payload))
}

function describeStateDoc(data) {
  if (!data) {
    return { exists: false, encrypted: false, hasWraps: false, wraps: null, dekId: null, meta: null, encMode: null }
  }
  const container = isContainer(data)
  return {
    exists: true,
    encrypted: container ? isEncryptedContainer(data) : isEnvelope(data),
    hasWraps: hasAnySlot(data?.wraps),
    wraps: data?.wraps ?? null,
    dekId: data?.dekId ?? null,
    meta: container ? data.meta ?? null : null,
    encMode: data?.encMode ?? null,
    legacy: !container,
  }
}

export async function pushToFirebase(config, state) {
  const dek = getCachedDek()
  if (!dek) {
    assertKeyExpected()
    const legacyKey = loadKeyString()
    if (legacyKey) {
      await writeStateDoc(config, await encryptForSlot(state, legacyKey, PERSONAL_AAD))
      return
    }
    const existing = await readStateDoc(config)
    if (describeStateDoc(existing).encrypted) throw new Error('encryption-key-required')
    await writeStateDoc(config, await buildContainer(state, null))
    return
  }

  const existing = await readStateDoc(config)
  const wraps = existing?.wraps ?? (hasAnySlot(loadLocalWraps()) ? loadLocalWraps() : null)
  if (!hasAnySlot(wraps)) throw new Error('sync-wraps-missing')

  await writeStateDoc(config, {
    ...await buildContainer(state, dek),
    encMode: MODE_SYNC,
    wraps,
    dekId: existing?.dekId ?? null,
  })
}

async function buildContainer(state, dek) {
  return encodeSlices({
    state: stripTransient(state),
    key: dek,
    aadFor: aadForPersonalSlice,
    rev: Date.now(),
  })
}

export async function pushEnabledContainer(config, { state, dek, wraps, dekId }) {
  await writeStateDoc(config, {
    ...await buildContainer(state, dek),
    encMode: MODE_SYNC,
    wraps,
    dekId,
  })
}

export async function fetchStateContainer(config) {
  const data = await readStateDoc(config)
  return isContainer(data) ? data : null
}

export async function publishRotation(config, { container, wraps, dekId }) {
  await writeStateDoc(config, { ...container, encMode: MODE_SYNC, wraps, dekId })
}

export async function pushWraps(config, wraps) {
  const existing = await readStateDoc(config)
  if (!existing) throw new Error('sync-doc-missing')
  await writeStateDoc(config, { ...existing, wraps })
}

export async function fetchStateWraps(config) {
  const data = await readStateDoc(config)
  return data?.wraps ?? null
}

export async function inspectRemoteState(config) {
  return describeStateDoc(await readStateDoc(config))
}

export async function pullFromFirebase(config) {
  const data = await readStateDoc(config)
  if (!data) return null

  if (isContainer(data)) {
    if (!isEncryptedContainer(data)) {
      return decodeSlices({ container: data, key: null, aadFor: aadForPersonalSlice })
    }
    const dek = getCachedDek()
    if (!dek) throw new Error('encryption-key-required')
    return decodeSlices({ container: data, key: dek, aadFor: aadForPersonalSlice })
  }

  if (!isEnvelope(data)) return data
  const keyString = loadKeyString()
  if (!keyString) throw new Error('encryption-key-required')
  return decryptForSlot(data, keyString, PERSONAL_AAD)
}

export async function validateFirebaseConfig(config) {
  const existingDefault = getApps().find(app => app.name === '[DEFAULT]')
  const sameProject = existingDefault
    && String(existingDefault.options?.projectId ?? '') === String(config?.projectId ?? '')
    && String(existingDefault.options?.apiKey ?? '') === String(config?.apiKey ?? '')

  if (sameProject) {
    const db = getFirestore(existingDefault)
    const snap = await runSyncOperation(existingDefault, () => getDoc(stateDoc(db)))
    return describeStateDoc(snap.exists() ? snap.data() : null)
  }

  const app = initializeApp(config, `validate_${Date.now()}`)
  try {
    const db = getFirestore(app)
    const snap = await runSyncOperation(app, () => getDoc(stateDoc(db)))
    return describeStateDoc(snap.exists() ? snap.data() : null)
  } finally {
    await deleteApp(app)
  }
}
