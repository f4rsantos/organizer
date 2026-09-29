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
afterEach(() => { vi.unstubAllGlobals() })

describe('v9 state version', () => {
  it('ticks the stored version so older builds treat synced state as newer', async () => {
    const { migrateState, CURRENT_VERSION } = await import('../../src/store/migrations.js')
    const { state, status } = migrateState({ version: 8 })
    expect(CURRENT_VERSION).toBe(9)
    expect(status).toBe('migrated')
    expect(state.version).toBe(9)
    expect(migrateState({ version: 10 }).status).toBe('newer')
  })
})
