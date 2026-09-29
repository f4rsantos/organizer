import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

function createStorage() {
  const map = new Map()
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    clear: () => map.clear(),
    key: i => [...map.keys()][i] ?? null,
    get length() { return map.size },
  }
}

const LEGACY_PATH = 'organizer/state'
const denied = () => Object.assign(new Error('permission-denied'), { code: 'permission-denied' })

function allowedByRules(rules, path, op) {
  const [collection, id] = path.split('/')
  if (collection !== 'organizer') return false
  if (rules === 'old') return path === LEGACY_PATH
  if (path === LEGACY_PATH) return op === 'get' || op === 'delete'
  return id.length === 64
}

function createFirestore() {
  const env = { rules: 'old', docs: new Map() }
  const check = (path, op) => { if (!allowedByRules(env.rules, path, op)) throw denied() }
  const snapshot = path => ({ exists: () => env.docs.has(path), data: () => env.docs.get(path) ?? null })

  vi.doMock('firebase/app', () => ({
    initializeApp: (options, name = '[DEFAULT]') => ({ name, options }),
    getApps: () => [],
    deleteApp: async () => {},
  }))
  vi.doMock('firebase/auth', () => ({
    getAuth: () => ({ currentUser: { uid: 'u' } }),
    initializeAuth: () => ({ currentUser: { uid: 'u' } }),
    indexedDBLocalPersistence: {},
    browserLocalPersistence: {},
    browserSessionPersistence: {},
    signInAnonymously: async () => ({}),
  }))
  vi.doMock('firebase/firestore', () => ({
    getFirestore: () => ({}),
    doc: (_db, collection, id) => ({ path: `${collection}/${id}` }),
    getDoc: async ref => { check(ref.path, 'get'); return snapshot(ref.path) },
    setDoc: async (ref, payload) => { check(ref.path, 'write'); env.docs.set(ref.path, payload) },
    runTransaction: async (_db, run) => {
      const staged = []
      const result = await run({
        get: async ref => { check(ref.path, 'get'); return snapshot(ref.path) },
        set: (ref, payload) => { check(ref.path, 'write'); staged.push(() => env.docs.set(ref.path, payload)) },
        delete: ref => { check(ref.path, 'delete'); staged.push(() => env.docs.delete(ref.path)) },
      })
      staged.forEach(apply => apply())
      return result
    },
  }))
  return env
}

const plainState = title => ({
  format: 'blue-tangerine',
  meta: { version: 9 },
  rev: 1,
  slices: { tasks: { plain: [{ id: 'a', title }] } },
})

const config = { apiKey: 'k', projectId: 'p', appId: '1:123:web:abc' }

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorage())
  vi.resetModules()
})
afterEach(() => { vi.unstubAllGlobals() })

describe('personal sync doc id', () => {
  it('is a 64-char hex id derived from the project and appId', async () => {
    createFirestore()
    const { personalSyncDocId } = await import('../../src/lib/firebase.js')
    const id = await personalSyncDocId(config)
    expect(id).toMatch(/^[0-9a-f]{64}$/)
    expect(await personalSyncDocId(config)).toBe(id)
    expect(await personalSyncDocId({ ...config, appId: '1:123:web:other' })).not.toBe(id)
  })

  it('cannot be derived from what an invite link carries', async () => {
    createFirestore()
    const { personalSyncDocId, SYNC_APP_ID_MISSING } = await import('../../src/lib/firebase.js')
    await expect(personalSyncDocId({ apiKey: 'k', projectId: 'p' })).rejects.toMatchObject({ code: SYNC_APP_ID_MISSING })
  })
})

describe('moving the legacy sync doc', () => {
  it('reports outdated rules instead of syncing to the shared legacy path', async () => {
    const env = createFirestore()
    env.docs.set(LEGACY_PATH, plainState('old'))
    const { pullFromFirebase, SYNC_RULES_OUTDATED } = await import('../../src/lib/firebase.js')

    await expect(pullFromFirebase(config)).rejects.toMatchObject({ code: SYNC_RULES_OUTDATED })
    expect(env.docs.has(LEGACY_PATH)).toBe(true)
  })

  it('moves the legacy doc to the private id once the new rules are published', async () => {
    const env = createFirestore()
    env.docs.set(LEGACY_PATH, plainState('mine'))
    const { migratePersonalSyncDoc, personalSyncDocId, pullFromFirebase } = await import('../../src/lib/firebase.js')

    env.rules = 'new'
    await migratePersonalSyncDoc(config)

    const newPath = `organizer/${await personalSyncDocId(config)}`
    expect(env.docs.has(LEGACY_PATH)).toBe(false)
    expect(env.docs.get(newPath).slices.tasks.plain[0].title).toBe('mine')
    const pulled = await pullFromFirebase(config)
    expect(pulled.state.tasks[0].title).toBe('mine')
  })

  it('keeps the already-migrated doc and still deletes a leftover legacy copy', async () => {
    const env = createFirestore()
    env.rules = 'new'
    const { migratePersonalSyncDoc, personalSyncDocId } = await import('../../src/lib/firebase.js')
    const newPath = `organizer/${await personalSyncDocId(config)}`
    env.docs.set(newPath, plainState('current'))
    env.docs.set(LEGACY_PATH, plainState('stale'))

    await migratePersonalSyncDoc(config)

    expect(env.docs.get(newPath).slices.tasks.plain[0].title).toBe('current')
    expect(env.docs.has(LEGACY_PATH)).toBe(false)
  })

  it('pushes to the private id, never the legacy path', async () => {
    const env = createFirestore()
    env.rules = 'new'
    const { pushToFirebase, personalSyncDocId } = await import('../../src/lib/firebase.js')

    await pushToFirebase(config, { version: 9, tasks: [{ id: 'a', title: 'new' }] })

    expect(env.docs.has(LEGACY_PATH)).toBe(false)
    expect(env.docs.has(`organizer/${await personalSyncDocId(config)}`)).toBe(true)
  })
})
