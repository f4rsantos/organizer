import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readStoredRaw, resetStateDb } from '../helpers/testStorage.js'

const KEY_STORAGE_KEY = 'f4rsantos.github.io/organizer:encryption-key'
const ENABLED_FLAG_KEY = 'f4rsantos.github.io/organizer:encryption-enabled'
const KEY = 'A'.repeat(43) + '='
const SCOPE = 'organizer-project'

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

afterEach(() => {
  vi.unstubAllGlobals()
})

const semester = { id: 'sem', name: '3a1s', presetKey: '3a1s', startDate: '2026-09-14', endDate: '2027-02-10' }
const oldClass = { id: 'c-old', semesterId: 'sem', name: 'CD', ects: 6 }
const oldTask = { id: 't-old', semesterId: 'sem', title: 'Old', done: false }

async function loadSyncedStore() {
  const { useStore } = await import('../../src/store/useStore.js')
  const { CURRENT_VERSION } = await import('../../src/store/migrations.js')
  const synced = {
    version: CURRENT_VERSION,
    activeSemesterId: 'sem',
    semesters: [semester],
    classes: [oldClass],
    tasks: [oldTask],
    presetUpdatedAt: { '3a1s': 1789000000000 },
  }
  useStore.setState({ hydrated: true })
  useStore.getState().importData(synced, { syncScope: SCOPE })
  return { useStore, synced }
}

async function flushWrites(predicate) {
  for (let i = 0; i < 100; i++) {
    await new Promise(resolve => setTimeout(resolve, 2))
    const raw = await readStoredRaw()
    if (raw !== null && predicate(raw)) return raw
  }
  return readStoredRaw()
}

describe('sync base persistence', () => {
  it('is stored readable when encryption is off', async () => {
    const { useStore } = await loadSyncedStore()
    const expected = JSON.stringify(useStore.getState().syncBase)
    const raw = await flushWrites(text => JSON.stringify(JSON.parse(text).slices.syncBase?.plain) === expected)
    const stored = JSON.parse(raw).slices.syncBase
    expect(stored.plain.scope).toBe(SCOPE)

    const { loadStateAsync } = await import('../../src/store/persist.js')
    expect((await loadStateAsync()).syncBase).toEqual(useStore.getState().syncBase)
  })

  it('is encrypted when encryption is on', async () => {
    storage.setItem(KEY_STORAGE_KEY, KEY)
    storage.setItem(ENABLED_FLAG_KEY, '1')
    const { useStore } = await loadSyncedStore()
    const raw = await flushWrites(text => JSON.parse(text).slices.syncBase !== null)
    const stored = JSON.parse(raw).slices.syncBase
    expect(typeof stored.ciphertext).toBe('string')
    expect(raw).not.toContain(SCOPE)

    const { loadStateAsync } = await import('../../src/store/persist.js')
    expect((await loadStateAsync()).syncBase).toEqual(useStore.getState().syncBase)
  })

  it('is never part of what gets pushed', async () => {
    const { useStore } = await loadSyncedStore()
    const { stripLocalSlices } = await import('../../src/lib/crypto/sliceCodec.js')
    expect(stripLocalSlices(useStore.getState())).not.toHaveProperty('syncBase')
  })
})
