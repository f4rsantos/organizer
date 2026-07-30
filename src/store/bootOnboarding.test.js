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

beforeEach(() => {
  storage = createStorage()
  vi.stubGlobal('localStorage', storage)
  vi.resetModules()
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

async function flush() {
  for (let i = 0; i < 50; i++) {
    await new Promise(resolve => setTimeout(resolve, 2))
    if (storage.getItem(STORAGE_KEY)) return
  }
}

describe('an existing user is never sent back to onboarding', () => {
  it('keeps onboardingDone when loading a legacy blob', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(existingUser()))
    const { loadState } = await import('./persist.js')
    expect(loadState().onboardingDone).toBe(true)
  })

  it('keeps onboardingDone through a container round trip', async () => {
    const { saveState, loadState } = await import('./persist.js')
    saveState(existingUser())
    await flush()
    expect(loadState().onboardingDone).toBe(true)
  })

  it('boots the store with onboardingDone from a legacy blob', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(existingUser()))
    const { useStore } = await import('./useStore.js')
    expect(useStore.getState().onboardingDone).toBe(true)
  })

  it('boots the store with onboardingDone from a container', async () => {
    const { saveState } = await import('./persist.js')
    saveState(existingUser())
    await flush()

    vi.resetModules()
    const { useStore } = await import('./useStore.js')
    expect(useStore.getState().onboardingDone).toBe(true)
  })

  it('keeps the semesters that gate the settings screen', async () => {
    const { saveState } = await import('./persist.js')
    saveState(existingUser())
    await flush()

    vi.resetModules()
    const { useStore } = await import('./useStore.js')
    expect(useStore.getState().semesters).toHaveLength(1)
  })
})
