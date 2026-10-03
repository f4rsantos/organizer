import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resetStateDb, flushPersist } from '../helpers/testStorage.js'

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
  vi.resetModules()
  await resetStateDb()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const existingUser = () => ({
  version: 6,
  theme: 'dark',
  lang: 'pt',
  onboardingDone: true,
  tasks: [{ id: 't1', title: 'real data' }],
  notes: [],
  settings: {},
  semesters: [{ id: 's1', name: 'S1' }],
})

describe('an existing user is never sent back to onboarding', () => {
  it('keeps onboardingDone when loading a legacy blob', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(existingUser()))
    const { loadState } = await import('../../src/store/persist.js')
    expect(loadState().onboardingDone).toBe(true)
  })

  it('keeps onboardingDone through a container round trip', async () => {
    const { saveState, loadStateAsync } = await import('../../src/store/persist.js')
    saveState(existingUser())
    await flushPersist()
    expect((await loadStateAsync()).onboardingDone).toBe(true)
  })

  it('hydrates the store with onboardingDone from a legacy blob', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(existingUser()))
    const { loadStateAsync } = await import('../../src/store/persist.js')
    const { useStore } = await import('../../src/store/useStore.js')

    useStore.getState().hydrateState(await loadStateAsync())
    expect(useStore.getState().onboardingDone).toBe(true)
  })

  it('hydrates the store with onboardingDone from a container', async () => {
    const { saveState } = await import('../../src/store/persist.js')
    saveState(existingUser())
    await flushPersist()

    vi.resetModules()
    const { loadStateAsync } = await import('../../src/store/persist.js')
    const { useStore } = await import('../../src/store/useStore.js')

    useStore.getState().hydrateState(await loadStateAsync())
    expect(useStore.getState().onboardingDone).toBe(true)
  })

  it('keeps the semesters that gate the settings screen', async () => {
    const { saveState } = await import('../../src/store/persist.js')
    saveState(existingUser())
    await flushPersist()

    vi.resetModules()
    const { loadStateAsync } = await import('../../src/store/persist.js')
    const { useStore } = await import('../../src/store/useStore.js')

    useStore.getState().hydrateState(await loadStateAsync())
    expect(useStore.getState().semesters).toHaveLength(1)
  })

  it('does not show onboarding before hydration finishes', async () => {
    const { saveState } = await import('../../src/store/persist.js')
    saveState(existingUser())
    await flushPersist()

    vi.resetModules()
    const { useStore } = await import('../../src/store/useStore.js')
    expect(useStore.getState().hydrated).toBeFalsy()
  })
})
