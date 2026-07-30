import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const STORAGE_KEY = 'f4rsantos.github.io/organizer'

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

  const { closeDekStore } = await import('../lib/crypto/keyStore.js')
  await closeDekStore()
  await new Promise(resolve => {
    const request = indexedDB.deleteDatabase('organizer-keys')
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })

  vi.resetModules()
})

afterEach(async () => {
  const { closeDekStore } = await import('../lib/crypto/keyStore.js')
  await closeDekStore()
  vi.unstubAllGlobals()
})

async function settle() {
  await new Promise(resolve => setTimeout(resolve, 80))
}

function stored() {
  const raw = storage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

describe('turning encryption on re-encrypts what is already stored', () => {
  it('replaces the plaintext container with ciphertext', async () => {
    const { useStore } = await import('./useStore.js')
    const { forceSaveState } = await import('./persist.js')
    const { enableLocalEncryption } = await import('../lib/crypto/localEnable.js')

    useStore.getState().completeOnboarding()
    useStore.getState().addTask({ title: 'secret plan' })
    await settle()

    expect(JSON.stringify(stored())).toContain('secret plan')

    await enableLocalEncryption({
      passphrase: 'purple-tractor-91',
      resave: () => forceSaveState(useStore.getState()),
    })
    await settle()

    expect(JSON.stringify(stored())).not.toContain('secret plan')
  })

  it('keeps onboardingDone readable after enabling', async () => {
    const { useStore } = await import('./useStore.js')
    const { forceSaveState } = await import('./persist.js')
    const { enableLocalEncryption } = await import('../lib/crypto/localEnable.js')

    useStore.getState().completeOnboarding()
    await settle()

    await enableLocalEncryption({
      passphrase: 'purple-tractor-91',
      resave: () => forceSaveState(useStore.getState()),
    })
    await settle()

    expect(stored().meta.onboardingDone).toBe(true)
  })

  it('reloads the data back through the async loader', async () => {
    const { useStore } = await import('./useStore.js')
    const { forceSaveState } = await import('./persist.js')
    const { enableLocalEncryption } = await import('../lib/crypto/localEnable.js')

    useStore.getState().completeOnboarding()
    useStore.getState().addTask({ title: 'secret plan' })
    await settle()

    await enableLocalEncryption({
      passphrase: 'purple-tractor-91',
      resave: () => forceSaveState(useStore.getState()),
    })
    await settle()

    const { loadStateAsync } = await import('./persist.js')
    const loaded = await loadStateAsync()
    expect(loaded).not.toBe(null)
    expect(loaded.onboardingDone).toBe(true)
    expect(loaded.tasks.some(task => task.title === 'secret plan')).toBe(true)
  })
})
