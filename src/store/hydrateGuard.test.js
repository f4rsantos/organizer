import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const STORAGE_KEY = 'f4rsantos.github.io/organizer'
const KEY_STORAGE_KEY = 'f4rsantos.github.io/organizer:encryption-key'
const ENABLED_FLAG_KEY = 'f4rsantos.github.io/organizer:encryption-enabled'
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

beforeEach(() => {
  storage = createStorage()
  vi.stubGlobal('localStorage', storage)
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const baseState = () => ({
  version: 7, theme: 'system', lang: 'en', onboardingDone: true,
  tasks: [{ id: 'a' }], notes: [], settings: {},
})

async function flush() {
  for (let i = 0; i < 50; i++) {
    await new Promise(resolve => setTimeout(resolve, 2))
    if (storage.getItem(STORAGE_KEY)) return
  }
}

describe('the render gate follows what is actually stored', () => {
  it('does not gate a fresh install', async () => {
    const { hasEncryptedSnapshot } = await import('./persist.js')
    expect(hasEncryptedSnapshot()).toBe(false)
  })

  it('does not gate a plaintext container', async () => {
    const { saveState, hasEncryptedSnapshot } = await import('./persist.js')
    saveState(baseState())
    await flush()
    expect(hasEncryptedSnapshot()).toBe(false)
  })

  it('does not gate on a stale enabled flag alone', async () => {
    storage.setItem(ENABLED_FLAG_KEY, '1')
    const { saveState, hasEncryptedSnapshot } = await import('./persist.js')
    saveState(baseState())
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(hasEncryptedSnapshot()).toBe(false)
  })

  it('gates a genuinely encrypted container', async () => {
    storage.setItem(KEY_STORAGE_KEY, KEY)
    storage.setItem(ENABLED_FLAG_KEY, '1')
    const { saveState, hasEncryptedSnapshot } = await import('./persist.js')
    saveState(baseState())
    await flush()
    expect(hasEncryptedSnapshot()).toBe(true)
  })
})

describe('edits made before hydration are never discarded', () => {
  it('keeps a task added before the snapshot resolves', async () => {
    const { useStore } = await import('./useStore.js')
    useStore.getState().addTask({ title: 'typed before hydrate' })

    useStore.getState().hydrateState({ version: 7, tasks: [], notes: [], settings: {} })

    expect(useStore.getState().tasks.some(t => t.title === 'typed before hydrate')).toBe(true)
    expect(useStore.getState().hydrated).toBe(true)
  })

  it('applies the snapshot when nothing was touched', async () => {
    const { useStore } = await import('./useStore.js')
    useStore.getState().hydrateState({
      version: 7, tasks: [{ id: 'z', title: 'from disk' }], notes: [], settings: {},
    })
    expect(useStore.getState().tasks[0].title).toBe('from disk')
  })

  it('clears the dirty marker after hydration', async () => {
    const { useStore } = await import('./useStore.js')
    useStore.getState().addTask({ title: 'x' })
    useStore.getState().hydrateState({ version: 7, tasks: [], notes: [], settings: {} })
    expect(useStore.getState().dirtiedBeforeHydrate).toBeUndefined()
  })

  it('never persists the dirty marker', async () => {
    const { useStore } = await import('./useStore.js')
    useStore.getState().addTask({ title: 'x' })
    useStore.getState().hydrateState({ version: 7, tasks: [], notes: [], settings: {} })
    useStore.getState().addTask({ title: 'y' })
    await flush()
    expect(storage.getItem(STORAGE_KEY)).not.toContain('dirtiedBeforeHydrate')
  })

  it('does not write to disk before hydration', async () => {
    const { useStore } = await import('./useStore.js')
    useStore.getState().addTask({ title: 'x' })
    await flush()
    expect(storage.getItem(STORAGE_KEY)).toBe(null)
  })

  it('flushes a pre-hydration edit to disk once hydration lands', async () => {
    const { useStore } = await import('./useStore.js')
    useStore.getState().addTask({ title: 'typed before hydrate' })

    useStore.getState().hydrateState({ version: 7, tasks: [], notes: [], settings: {} })
    await flush()

    expect(storage.getItem(STORAGE_KEY)).toContain('typed before hydrate')
  })

  it('flushes a pre-hydration edit when the snapshot fails to load', async () => {
    const { useStore } = await import('./useStore.js')
    useStore.getState().addTask({ title: 'survives failed load' })

    useStore.getState().markHydrated()
    await flush()

    expect(storage.getItem(STORAGE_KEY)).toContain('survives failed load')
  })

  it('does not flush an empty membership list over the stored one', async () => {
    const { useStore } = await import('./useStore.js')

    useStore.getState().removeCollabMembership('t1')
    await flush()

    expect(storage.getItem(STORAGE_KEY)).toBe(null)
  })
})
