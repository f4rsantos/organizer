import { initializeApp, getApps, deleteApp } from 'firebase/app'
import { getFirestore, doc, setDoc, getDoc, runTransaction } from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import { getAnonymousAuth } from './firebaseAuth'
import {
  loadKeyString, encryptForSlot, decryptForSlot, isEnvelope, assertKeyExpected,
  aadForPersonalSlice, WHOLE_STATE, getCachedDek, hasAnySlot,
  isContainer, isEncryptedContainer, encodeSlices, decodeSlices, stripTransient,
  MODE_SYNC, loadLocalWraps, loadDekId,
} from './crypto'
import { readDevicePref, writeDevicePref } from './devicePrefs'

export { loadFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig } from './firebaseConfig'

const SYNC_COLLECTION = 'organizer'
const LEGACY_SYNC_DOC_ID = 'state'
export const SYNC_RULES_OUTDATED = 'sync-rules-outdated'
export const SYNC_APP_ID_MISSING = 'sync-app-id-missing'
const RESOLVED_SYNC_DOCS = new Set()
export const REV_CONFLICT = 'sync-rev-conflict'
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

const DEFAULT_APP_NAME = '[DEFAULT]'

function isSameProject(app, config) {
  return String(app?.options?.projectId ?? '') === String(config?.projectId ?? '')
    && String(app?.options?.apiKey ?? '') === String(config?.apiKey ?? '')
}

function findDefaultApp() {
  return getApps().find(app => app.name === DEFAULT_APP_NAME)
}

async function getApp(config) {
  const existingDefault = findDefaultApp()
  if (existingDefault && isSameProject(existingDefault, config)) return existingDefault
  if (existingDefault) {
    ANON_AUTH_STATUS.delete(DEFAULT_APP_NAME)
    await deleteApp(existingDefault)
  }
  return initializeApp(config)
}

function syncError(code) {
  return Object.assign(new Error(code), { code })
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function personalSyncDocId(config) {
  const appId = String(config?.appId ?? '').trim()
  if (!appId) throw syncError(SYNC_APP_ID_MISSING)
  const material = new TextEncoder().encode(`organizer-sync:${config.projectId}:${appId}`)
  return toHex(await crypto.subtle.digest('SHA-256', material))
}

async function moveLegacyStateDoc(db, ref) {
  const legacyRef = doc(db, SYNC_COLLECTION, LEGACY_SYNC_DOC_ID)
  await runTransaction(db, async tx => {
    const current = await tx.get(ref)
    const legacy = await tx.get(legacyRef)
    if (!legacy.exists()) return
    if (!current.exists()) tx.set(ref, legacy.data())
    tx.delete(legacyRef)
  })
}

async function resolveStateDoc(app, config) {
  const db = getFirestore(app)
  const docId = await personalSyncDocId(config)
  const ref = doc(db, SYNC_COLLECTION, docId)
  const cacheKey = `${app.name}:${docId}`
  if (RESOLVED_SYNC_DOCS.has(cacheKey)) return ref
  try {
    await runSyncOperation(app, () => moveLegacyStateDoc(db, ref))
  } catch (error) {
    if (isLikelyAuthRulesError(error)) throw syncError(SYNC_RULES_OUTDATED)
    throw error
  }
  RESOLVED_SYNC_DOCS.add(cacheKey)
  return ref
}

export async function migratePersonalSyncDoc(config) {
  const app = await getApp(config)
  await signInAnonymouslyOrThrow(app)
  markCollabRulesEnabled()
  await resolveStateDoc(app, config)
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

async function signInAnonymouslyOrThrow(app) {
  const auth = getAnonymousAuth(app)
  if (!auth.currentUser) await signInAnonymously(auth)
  ANON_AUTH_STATUS.set(app.name, 'ok')
  clearAnonAuthFailure(app)
}

async function trySignInAnonymously(app) {
  const status = ANON_AUTH_STATUS.get(app.name)
  if (status === 'failed') return false
  if (status === 'ok') return true
  if (isAnonAuthCooldownActive(app)) {
    ANON_AUTH_STATUS.set(app.name, 'failed')
    return false
  }

  const auth = getAnonymousAuth(app)
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
      await signInAnonymouslyOrThrow(app)
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

    markCollabRulesEnabled()
    return operation()
  }
}

async function readStateDoc(config) {
  const app = await getApp(config)
  const ref = await resolveStateDoc(app, config)
  const snap = await runSyncOperation(app, () => getDoc(ref))
  return snap.exists() ? snap.data() : null
}

async function writeStateDoc(config, payload) {
  const app = await getApp(config)
  const ref = await resolveStateDoc(app, config)
  await runSyncOperation(app, () => setDoc(ref, payload))
}

function readRev(data) {
  const rev = Number(data?.rev)
  return Number.isFinite(rev) ? rev : 0
}

async function writeStateDocGuarded(config, buildPayload, baseRev) {
  const app = await getApp(config)
  const db = getFirestore(app)
  const ref = await resolveStateDoc(app, config)
  return runSyncOperation(app, () => runTransaction(db, async tx => {
    const snap = await tx.get(ref)
    const existing = snap.exists() ? snap.data() : null
    const remoteRev = readRev(existing)
    if (existing && baseRev !== null && remoteRev > baseRev) {
      throw new Error(REV_CONFLICT)
    }
    const payload = await buildPayload(existing, remoteRev)
    tx.set(ref, payload)
    return payload.rev ?? null
  }))
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

// Returns the `rev` written, so the caller can track what this device last
// saw. Throws REV_CONFLICT when another device wrote since `baseRev`.
export async function pushToFirebase(config, state, { baseRev = null } = {}) {
  const dek = getCachedDek()
  if (!dek) {
    assertKeyExpected()
    const legacyKey = loadKeyString()
    if (legacyKey) {
      // Legacy whole-doc envelopes carry no rev, so there is nothing to guard on.
      await writeStateDoc(config, await encryptForSlot(state, legacyKey, PERSONAL_AAD))
      return null
    }
    return writeStateDocGuarded(config, async existing => {
      if (describeStateDoc(existing).encrypted) throw new Error('encryption-key-required')
      return buildContainer(state, null)
    }, baseRev)
  }

  return writeStateDocGuarded(config, async existing => {
    const wraps = existing?.wraps ?? (hasAnySlot(loadLocalWraps()) ? loadLocalWraps() : null)
    if (!hasAnySlot(wraps)) throw new Error('sync-wraps-missing')

    const localDekId = loadDekId()
    if (existing?.dekId && localDekId && existing.dekId !== localDekId) {
      throw new Error('dek-id-mismatch')
    }

    return {
      ...await buildContainer(state, dek),
      encMode: MODE_SYNC,
      wraps,
      dekId: existing?.dekId ?? localDekId ?? null,
    }
  }, baseRev)
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

// Resolves to `{ state, rev }` so the caller can guard its next push against
// the exact revision it read.
export async function pullFromFirebase(config) {
  const data = await readStateDoc(config)
  if (!data) return null
  const rev = readRev(data)

  if (isContainer(data)) {
    if (!isEncryptedContainer(data)) {
      return { state: await decodeSlices({ container: data, key: null, aadFor: aadForPersonalSlice }), rev }
    }
    const dek = getCachedDek()
    if (!dek) throw new Error('encryption-key-required')
    return { state: await decodeSlices({ container: data, key: dek, aadFor: aadForPersonalSlice }), rev }
  }

  if (!isEnvelope(data)) return { state: data, rev }
  const keyString = loadKeyString()
  if (!keyString) throw new Error('encryption-key-required')
  return { state: await decryptForSlot(data, keyString, PERSONAL_AAD), rev }
}

async function readForValidation(app, config) {
  await signInAnonymouslyOrThrow(app)
  ANON_AUTH_STATUS.delete(DEFAULT_APP_NAME)
  markCollabRulesEnabled()
  const ref = await resolveStateDoc(app, config)
  return getDoc(ref)
}

export async function validateFirebaseConfig(config) {
  const existingDefault = findDefaultApp()
  if (existingDefault && isSameProject(existingDefault, config)) {
    const snap = await readForValidation(existingDefault, config)
    return describeStateDoc(snap.exists() ? snap.data() : null)
  }

  const app = initializeApp(config, `validate_${Date.now()}`)
  try {
    const snap = await readForValidation(app, config)
    return describeStateDoc(snap.exists() ? snap.data() : null)
  } finally {
    await deleteApp(app)
  }
}
