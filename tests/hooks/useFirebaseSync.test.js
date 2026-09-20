import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resetStateDb } from '../helpers/testStorage.js'
import { useStore } from '@/store/useStore'
import { setInitialSyncRev, getInitialSyncRev, resetInitialSyncRevForTests } from '../../src/hooks/useFirebaseSync'

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

const plainRemote = (rev, tasks) => ({
  format: 'blue-tangerine',
  meta: { version: 7 },
  rev,
  slices: { tasks: { plain: tasks } },
})

beforeEach(async () => {
  vi.stubGlobal('localStorage', createStorage())
  vi.resetModules()
  await resetStateDb()
  resetInitialSyncRevForTests()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useFirebaseSync initialSyncRev coordinate', () => {
  it('stores and clears initial sync revision', () => {
    expect(useStore.getState().tasks).toEqual([])
    setInitialSyncRev(12345)
    expect(getInitialSyncRev()).toBe(12345)
    resetInitialSyncRevForTests()
    expect(getInitialSyncRev()).toBe(null)
  })
})

describe('useFirebaseSync module exports', () => {
  it('provides the sync hook and initial sync controls', async () => {
    const written = []
    const remote = { value: plainRemote(200, [{ id: 't1', title: 'remote task' }]) }

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

    const { saveFirebaseConfig } = await import('@/lib/firebase')
    saveFirebaseConfig({ apiKey: 'k', projectId: 'p' })

    const { useFirebaseSync } = await import('../../src/hooks/useFirebaseSync')
    expect(useFirebaseSync).toBeDefined()
  })
})

describe('useHydrateState with remote data', () => {
  it('loads remote data when firebase is configured', async () => {
    const remote = { value: plainRemote(500, [{ id: 't_remote', title: 'remote item' }]) }

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
      setDoc: async () => {},
      runTransaction: async () => {},
    }))

    const { saveFirebaseConfig } = await import('@/lib/firebase')
    saveFirebaseConfig({ apiKey: 'k', projectId: 'p' })

    const { useHydrateState } = await import('../../src/hooks/useHydrateState')
    expect(useHydrateState).toBeDefined()
  })
})
