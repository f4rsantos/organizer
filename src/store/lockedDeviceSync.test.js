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

beforeEach(async () => {
  vi.stubGlobal('localStorage', createStorage())
  vi.resetModules()
  await resetStateDb()
})
afterEach(() => { vi.unstubAllGlobals() })

const encryptedRemote = () => ({
  format: 'blue-tangerine',
  encMode: 'sync',
  meta: { version: 6 },
  wraps: { passphrase: { salt: 'x', iv: 'y', wrapped: 'z' } },
  dekId: 'abc',
  slices: { tasks: { version: 1, iv: 'aa', ciphertext: 'bb' } },
})

describe('locked second device must not clobber the encrypted remote', () => {
  it('refuses to push plaintext over an encrypted doc', async () => {
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
      getDoc: async () => ({ exists: () => true, data: () => encryptedRemote() }),
      setDoc: async (_ref, payload) => { written.push(payload) },
    }))

    const { pushToFirebase } = await import('../lib/firebase.js')

    let error = null
    try {
      await pushToFirebase({ apiKey: 'k', projectId: 'p' }, {
        version: 6, tasks: [{ id: 't', title: 'stale local plan' }],
      })
    } catch (err) { error = err }

    console.log('ERROR', error?.message ?? 'NONE')
    console.log('WRITES', written.length)
    if (written.length) console.log('WROTE', JSON.stringify(written[0]).slice(0, 160))

    expect(written).toHaveLength(0)
  })
})
