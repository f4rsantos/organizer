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

const withCode = code => Object.assign(new Error(code), { code })

function mockFirebase(env) {
  vi.doMock('firebase/app', () => ({
    initializeApp: (options, name = '[DEFAULT]') => {
      const app = { name, options }
      env.apps.push(app)
      return app
    },
    getApps: () => env.apps,
    deleteApp: async app => { env.apps = env.apps.filter(a => a !== app) },
  }))
  vi.doMock('firebase/auth', () => ({
    getAuth: app => env.authFor(app),
    initializeAuth: app => env.authFor(app),
    indexedDBLocalPersistence: {},
    browserLocalPersistence: {},
    browserSessionPersistence: {},
    signInAnonymously: async auth => {
      env.signInCalls += 1
      if (!env.anonEnabled) throw withCode('auth/admin-restricted-operation')
      auth.currentUser = { uid: 'u' }
    },
  }))
  vi.doMock('firebase/firestore', () => ({
    getFirestore: app => ({ app }),
    doc: db => ({ db }),
    getDoc: async ref => {
      env.reads.push(ref.db.app.options.projectId)
      if (!env.authFor(ref.db.app).currentUser) throw withCode('permission-denied')
      return { exists: () => false, data: () => null }
    },
    setDoc: async () => {},
    runTransaction: async () => {},
  }))
}

function createEnv() {
  const auths = new Map()
  return {
    apps: [],
    reads: [],
    signInCalls: 0,
    anonEnabled: false,
    authFor(app) {
      if (!auths.has(app)) auths.set(app, { currentUser: null })
      return auths.get(app)
    },
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorage())
  vi.resetModules()
})
afterEach(() => { vi.unstubAllGlobals() })

const config = { apiKey: 'k', projectId: 'p' }

describe('connecting a firebase project', () => {
  it('surfaces the anonymous sign-in error instead of a generic failure', async () => {
    const env = createEnv()
    mockFirebase(env)
    const { validateFirebaseConfig } = await import('../../src/lib/firebase.js')

    await expect(validateFirebaseConfig(config)).rejects.toMatchObject({ code: 'auth/admin-restricted-operation' })
  })

  it('retries sign-in right after the user enables anonymous auth, ignoring the failure cooldown', async () => {
    const env = createEnv()
    mockFirebase(env)
    const { validateFirebaseConfig, pullFromFirebase } = await import('../../src/lib/firebase.js')

    await expect(pullFromFirebase(config)).rejects.toMatchObject({ code: 'permission-denied' })
    const callsBefore = env.signInCalls

    env.anonEnabled = true
    const remote = await validateFirebaseConfig(config)

    expect(env.signInCalls).toBeGreaterThan(callsBefore)
    expect(remote.exists).toBe(false)
    await expect(pullFromFirebase(config)).resolves.toBeNull()
  })

  it('syncs against the newly connected project, not a stale default app', async () => {
    const env = createEnv()
    env.anonEnabled = true
    mockFirebase(env)
    const { pullFromFirebase } = await import('../../src/lib/firebase.js')

    await pullFromFirebase({ apiKey: 'k1', projectId: 'old' })
    await pullFromFirebase({ apiKey: 'k2', projectId: 'new' })

    expect(env.reads.at(-1)).toBe('new')
    expect(env.apps.map(a => a.options.projectId)).toEqual(['new'])
  })
})
