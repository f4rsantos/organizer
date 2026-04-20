import { initializeApp, getApps, deleteApp } from 'firebase/app'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'

const CONFIG_KEY = 'f4rsantos.github.io/organizer:firebase'
const DOC_PATH = { collection: 'organizer', id: 'state' }
const COLLAB_RULES_TAG_KEY = `${CONFIG_KEY}:collab-rules-tag`
const ANON_AUTH_FAIL_KEY = `${CONFIG_KEY}:anon-auth-fail`
const ANON_AUTH_STATUS = new Map()
const ANON_AUTH_PENDING = new Map()
const ANON_AUTH_FAIL_COOLDOWN_MS = 10 * 60 * 1000

export function loadFirebaseConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveFirebaseConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function clearFirebaseConfig() {
  localStorage.removeItem(CONFIG_KEY)
}

export function loadCollabRulesTag() {
  try {
    const raw = localStorage.getItem(COLLAB_RULES_TAG_KEY)
    return raw === '1' ? 1 : 0
  } catch {
    return 0
  }
}

export function markCollabRulesEnabled() {
  try {
    localStorage.setItem(COLLAB_RULES_TAG_KEY, '1')
  } catch {
  }
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
  try {
    const raw = localStorage.getItem(ANON_AUTH_FAIL_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAnonFailCache(cache) {
  try {
    localStorage.setItem(ANON_AUTH_FAIL_KEY, JSON.stringify(cache))
  } catch {
  }
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

export async function pushToFirebase(config, state) {
  const app = getApp(config)
  const db = getFirestore(app)
  await runSyncOperation(app, () => setDoc(stateDoc(db), state))
}

export async function pullFromFirebase(config) {
  const app = getApp(config)
  const db = getFirestore(app)
  const snap = await runSyncOperation(app, () => getDoc(stateDoc(db)))
  return snap.exists() ? snap.data() : null
}

export async function validateFirebaseConfig(config) {
  const existingDefault = getApps().find(app => app.name === '[DEFAULT]')
  const sameProject = existingDefault
    && String(existingDefault.options?.projectId ?? '') === String(config?.projectId ?? '')
    && String(existingDefault.options?.apiKey ?? '') === String(config?.apiKey ?? '')

  if (sameProject) {
    const db = getFirestore(existingDefault)
    await runSyncOperation(existingDefault, () => getDoc(stateDoc(db)))
    return
  }

  const app = initializeApp(config, `validate_${Date.now()}`)
  try {
    const db = getFirestore(app)
    await runSyncOperation(app, () => getDoc(stateDoc(db)))
  } finally {
    await deleteApp(app)
  }
}
