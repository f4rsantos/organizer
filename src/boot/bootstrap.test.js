import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readStoredRaw, resetStateDb } from '../store/testStorage.js'

const STORAGE_KEY = 'f4rsantos.github.io/organizer'
const ENABLED_FLAG_KEY = 'f4rsantos.github.io/organizer:encryption-enabled'
const KEY_STORAGE_KEY = 'f4rsantos.github.io/organizer:encryption-key'
const MODE_KEY = 'f4rsantos.github.io/organizer:enc-mode'
const KEY = 'A'.repeat(43) + '='

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
  vi.stubGlobal('sessionStorage', createStorage())
  vi.stubGlobal('location', { hash: '', pathname: '/' })
  vi.stubGlobal('history', { replaceState: () => {} })
  vi.resetModules()
  await resetStateDb()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const plainState = () => ({
  version: 6, theme: 'dark', lang: 'pt', onboardingDone: true,
  tasks: [{ id: 't1' }], notes: [], settings: {},
})

async function flush() {
  for (let i = 0; i < 50; i++) {
    await new Promise(resolve => setTimeout(resolve, 2))
    if (await readStoredRaw()) return
  }
}

describe('boot never locks a user out of plaintext data', () => {
  it('does not ask to unlock a fresh install', async () => {
    const { runBootstrap } = await import('./bootstrap.js')
    expect((await runBootstrap()).needsUnlock).toBe(false)
  })

  it('does not ask to unlock a plaintext container', async () => {
    const { saveState } = await import('../store/persist.js')
    saveState(plainState())
    await flush()

    vi.resetModules()
    const { runBootstrap } = await import('./bootstrap.js')
    expect((await runBootstrap()).needsUnlock).toBe(false)
  })

  it('ignores a stale legacy enabled flag when nothing is encrypted', async () => {
    storage.setItem(ENABLED_FLAG_KEY, '1')
    const { saveState } = await import('../store/persist.js')
    saveState(plainState())
    await new Promise(resolve => setTimeout(resolve, 40))

    vi.resetModules()
    const { runBootstrap } = await import('./bootstrap.js')
    expect((await runBootstrap()).needsUnlock).toBe(false)
  })

  it('ignores a stale enc-mode when nothing is encrypted', async () => {
    storage.setItem(MODE_KEY, 'local')
    const { saveState } = await import('../store/persist.js')
    saveState(plainState())
    await new Promise(resolve => setTimeout(resolve, 40))

    vi.resetModules()
    const { runBootstrap } = await import('./bootstrap.js')
    expect((await runBootstrap()).needsUnlock).toBe(false)
  })
})

describe('boot does ask to unlock real ciphertext', () => {
  it('asks when the stored container is encrypted and no key is held', async () => {
    storage.setItem(KEY_STORAGE_KEY, KEY)
    storage.setItem(ENABLED_FLAG_KEY, '1')
    const { saveState } = await import('../store/persist.js')
    saveState(plainState())
    await flush()

    storage.removeItem(KEY_STORAGE_KEY)
    vi.resetModules()
    const { runBootstrap } = await import('./bootstrap.js')
    expect((await runBootstrap()).needsUnlock).toBe(true)
  })
})
