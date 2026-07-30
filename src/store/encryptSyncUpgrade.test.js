import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resetStateDb } from './testStorage.js'

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

let storage

beforeEach(async () => {
  storage = createStorage()
  vi.stubGlobal('localStorage', storage)
  vi.resetModules()
  await resetStateDb()
})

afterEach(async () => {
  const { closeDekStore } = await import('../lib/crypto/keyStore.js')
  await closeDekStore()
  vi.unstubAllGlobals()
})

const plainState = () => ({
  version: 6, theme: 'system', lang: 'en', onboardingDone: true,
  tasks: [{ id: 't1', title: 'secret plan' }],
  notes: [], settings: {},
})

describe('enabling encryption while firebase sync is on', () => {
  it('encrypts the remote doc instead of leaving it plaintext', async () => {
    const written = []
    vi.doMock('firebase/app', () => ({
      initializeApp: () => ({ name: '[DEFAULT]', options: {} }),
      getApps: () => [{ name: '[DEFAULT]', options: {} }],
      deleteApp: async () => {},
    }))
    vi.doMock('firebase/auth', () => ({
      getAuth: () => ({ currentUser: { uid: 'u' } }),
      signInAnonymously: async () => ({}),
    }))
    vi.doMock('firebase/firestore', () => ({
      getFirestore: () => ({}),
      doc: () => ({}),
      getDoc: async () => ({ exists: () => false, data: () => null }),
      setDoc: async (_ref, payload) => { written.push(payload) },
    }))

    const { enableLocalEncryption } = await import('../lib/crypto/localEnable.js')
    const { pushEnabledContainer } = await import('../lib/firebase.js')

    await enableLocalEncryption({
      passphrase: 'purple-tractor-91',
      resave: async () => {},
      syncTarget: {
        state: plainState(),
        pushContainer: payload => pushEnabledContainer({ apiKey: 'k', projectId: 'p' }, payload),
      },
    })

    expect(written).toHaveLength(1)
    expect(JSON.stringify(written[0])).not.toContain('secret plan')
    expect(written[0].wraps).toBeTruthy()
    expect(written[0].encMode).toBe('sync')
  })

  it('lands in sync mode, not local-only mode', async () => {
    const { enableLocalEncryption } = await import('../lib/crypto/localEnable.js')
    const { getEncMode, MODE_SYNC } = await import('../lib/crypto/keyState.js')

    await enableLocalEncryption({
      passphrase: 'purple-tractor-91',
      resave: async () => {},
      syncTarget: { state: plainState(), pushContainer: () => Promise.resolve() },
    })

    expect(getEncMode()).toBe(MODE_SYNC)
  })

  it('stays local-only when there is no firebase config', async () => {
    const { enableLocalEncryption } = await import('../lib/crypto/localEnable.js')
    const { getEncMode, MODE_LOCAL } = await import('../lib/crypto/keyState.js')

    await enableLocalEncryption({
      passphrase: 'purple-tractor-91',
      resave: async () => {},
      syncTarget: null,
    })

    expect(getEncMode()).toBe(MODE_LOCAL)
  })

  it('does not enable encryption at all if the remote push fails', async () => {
    const { enableLocalEncryption, readLocalWraps } = await import('../lib/crypto/localEnable.js')
    const { getEncMode, MODE_OFF } = await import('../lib/crypto/keyState.js')

    await expect(enableLocalEncryption({
      passphrase: 'purple-tractor-91',
      resave: async () => {},
      syncTarget: {
        state: plainState(),
        pushContainer: () => Promise.reject(new Error('network down')),
      },
    })).rejects.toThrow('network down')

    expect(getEncMode()).toBe(MODE_OFF)
    expect(readLocalWraps()).toBe(null)
  })
})
