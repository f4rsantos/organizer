import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resetStateDb } from '../helpers/testStorage.js'

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

afterEach(() => {
  vi.unstubAllGlobals()
})

async function importRemote(local, remote) {
  const { useStore } = await import('../../src/store/useStore.js')
  const { CURRENT_VERSION } = await import('../../src/store/migrations.js')
  useStore.setState({ hydrated: true, presetUpdatedAt: local })
  useStore.getState().importData({ version: CURRENT_VERSION, presetUpdatedAt: remote })
  return useStore.getState().presetUpdatedAt
}

describe('importData with presetUpdatedAt', () => {
  it('keeps a local preset update the remote copy has not caught up with', async () => {
    const merged = await importRemote(
      { '3a1s': 1790071577600, s1: 1788272268669 },
      { '3a1s': 1789000000000 },
    )
    expect(merged).toEqual({ '3a1s': 1790071577600, s1: 1788272268669 })
  })

  it('adopts a newer preset update applied on another device', async () => {
    const merged = await importRemote(
      { '3a1s': 1789000000000 },
      { '3a1s': 1790071577600, s2: 1788000000000 },
    )
    expect(merged).toEqual({ '3a1s': 1790071577600, s2: 1788000000000 })
  })
})
