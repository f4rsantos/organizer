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

const plainRemote = (rev, tasks) => ({
  format: 'blue-tangerine',
  meta: { version: 7 },
  rev,
  slices: { tasks: { plain: tasks } },
})

// `remote` is the doc the fake transaction reads; `written` collects writes.
function mockFirestore(remote, written) {
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
    getDoc: async () => ({ exists: () => remote.value !== null, data: () => remote.value }),
    setDoc: async (_ref, payload) => { written.push(payload) },
    runTransaction: async (_db, run) => run({
      get: async () => ({ exists: () => remote.value !== null, data: () => remote.value }),
      set: (_ref, payload) => { written.push(payload); remote.value = payload },
    }),
  }))
}

const config = { apiKey: 'k', projectId: 'p' }

describe('push guards against overwriting a newer remote', () => {
  it('refuses to write when the remote moved past the revision this device read', async () => {
    const written = []
    const remote = { value: plainRemote(200, [{ id: 'b', title: 'from other device' }]) }
    mockFirestore(remote, written)

    const { pushToFirebase, REV_CONFLICT } = await import('../lib/firebase.js')

    let error = null
    try {
      // This device last read rev 100; the remote is now at 200.
      await pushToFirebase(config, { version: 7, tasks: [{ id: 'a', title: 'stale' }] }, { baseRev: 100 })
    } catch (err) { error = err }

    expect(error?.message).toBe(REV_CONFLICT)
    expect(written).toHaveLength(0)
    expect(remote.value.slices.tasks.plain[0].title).toBe('from other device')
  })

  it('writes when the remote is still at the revision this device read', async () => {
    const written = []
    const remote = { value: plainRemote(100, [{ id: 'a', title: 'old' }]) }
    mockFirestore(remote, written)

    const { pushToFirebase } = await import('../lib/firebase.js')
    const rev = await pushToFirebase(config, { version: 7, tasks: [{ id: 'a', title: 'new' }] }, { baseRev: 100 })

    expect(written).toHaveLength(1)
    expect(written[0].slices.tasks.plain[0].title).toBe('new')
    expect(rev).toBeGreaterThan(100)
  })

  it('seeds an empty remote', async () => {
    const written = []
    const remote = { value: null }
    mockFirestore(remote, written)

    const { pushToFirebase } = await import('../lib/firebase.js')
    await pushToFirebase(config, { version: 7, tasks: [{ id: 'a', title: 'first' }] }, { baseRev: null })

    expect(written).toHaveLength(1)
  })
})

describe('pull reports the revision it read', () => {
  it('returns state alongside rev', async () => {
    const written = []
    const remote = { value: plainRemote(42, [{ id: 'a', title: 'x' }]) }
    mockFirestore(remote, written)

    const { pullFromFirebase } = await import('../lib/firebase.js')
    const pulled = await pullFromFirebase(config)

    expect(pulled.rev).toBe(42)
    expect(pulled.state.tasks[0].title).toBe('x')
    expect(pulled.state.version).toBe(7)
  })

  it('reports rev 0 for a doc written before revisions existed', async () => {
    const written = []
    const legacy = { format: 'blue-tangerine', meta: { version: 7 }, slices: { tasks: { plain: [] } } }
    const remote = { value: legacy }
    mockFirestore(remote, written)

    const { pullFromFirebase } = await import('../lib/firebase.js')
    expect((await pullFromFirebase(config)).rev).toBe(0)
  })
})
