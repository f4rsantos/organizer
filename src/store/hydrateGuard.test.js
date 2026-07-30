import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readStoredRaw, resetStateDb } from './testStorage.js'

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

beforeEach(async () => {
  storage = createStorage()
  vi.stubGlobal('localStorage', storage)
  vi.resetModules()
  await resetStateDb()
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
    if (await readStoredRaw()) return
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
    expect(await readStoredRaw()).not.toContain('dirtiedBeforeHydrate')
  })

  it('does not write to disk before hydration', async () => {
    const { useStore } = await import('./useStore.js')
    useStore.getState().addTask({ title: 'x' })
    await flush()
    expect(await readStoredRaw()).toBe(null)
  })

  it('does not let a second hydration revert an edit made after the first', async () => {
    const { useStore } = await import('./useStore.js')
    const snapshot = () => ({ version: 7, tasks: [{ id: 'a', title: 'from disk' }], notes: [], settings: {} })

    useStore.getState().hydrateState(snapshot())
    useStore.getState().updateTask('a', { title: 'edited after hydrate' })
    useStore.getState().hydrateState(snapshot())

    expect(useStore.getState().tasks[0].title).toBe('edited after hydrate')
  })

  it('keeps collab runtime and memberships through a tab-switch pull', async () => {
    const { useStore } = await import('./useStore.js')
    useStore.getState().markHydrated()
    useStore.getState().addCollabMembership({
      teamId: 't1', projectId: 'p', apiKey: 'k', teamKey: 'tk', teamName: 'Real Team',
    })
    useStore.getState().setCollabRuntimeTeam('t1', {
      name: 'Real Team', expiresAt: Date.now() + 86400000, syncStatus: 'live',
    })

    useStore.getState().importData({
      version: 6, theme: 'system', lang: 'en', onboardingDone: true,
      tasks: [], notes: [], settings: {},
      collab: { userId: 'u1', memberships: [] },
    })

    expect(useStore.getState().collab.memberships).toHaveLength(1)
    expect(useStore.getState().collabRuntime?.teams?.t1?.name).toBe('Real Team')
  })

  it('keeps app toggles and tab renames through a tab-switch pull', async () => {
    const { useStore } = await import('./useStore.js')
    useStore.getState().markHydrated()
    useStore.getState().updateSettings({
      apps: { collab: false, notes: true, eisenhower: false },
      navbar: { order: ['tasks', 'kanban'], hidden: [], customNames: { tasks: 'My Stuff' } },
    })

    useStore.getState().importData({
      version: 6, theme: 'system', lang: 'en', onboardingDone: true,
      tasks: [], notes: [],
      settings: {
        apps: { collab: false, notes: false, eisenhower: false },
        navbar: { order: ['tasks', 'kanban'], hidden: [], customNames: {} },
      },
      collab: { userId: 'u1', memberships: [] },
    })

    expect(useStore.getState().settings.apps.notes).toBe(true)
    expect(useStore.getState().settings.navbar.customNames?.tasks).toBe('My Stuff')
  })

  it('lets an explicit restore replace local settings', async () => {
    const { useStore } = await import('./useStore.js')
    useStore.getState().markHydrated()
    useStore.getState().updateSettings({ apps: { collab: false, notes: true, eisenhower: false } })

    useStore.getState().importData({
      version: 6, theme: 'system', lang: 'en', onboardingDone: true,
      tasks: [], notes: [],
      settings: { apps: { collab: false, notes: false, eisenhower: false } },
      collab: { userId: 'u1', memberships: [] },
    }, { preferLocalSettings: false })

    expect(useStore.getState().settings.apps.notes).toBe(false)
  })

  it('lets a remote membership update win over the local copy', async () => {
    const { useStore } = await import('./useStore.js')
    useStore.getState().markHydrated()
    useStore.getState().addCollabMembership({ teamId: 'merge1', teamName: 'OLD', apiKey: 'k', projectId: 'p' })

    useStore.getState().importData({
      version: 6, theme: 'system', lang: 'en', onboardingDone: true,
      tasks: [], notes: [], settings: {},
      collab: { userId: 'u1', memberships: [{ teamId: 'merge1', teamName: 'NEW', apiKey: 'k', projectId: 'p', teamKey: null }] },
    })

    const merged = useStore.getState().collab.memberships.filter(m => m.teamId === 'merge1')
    expect(merged).toHaveLength(1)
    expect(merged[0].teamName).toBe('NEW')
  })

  it('flushes a pre-hydration edit to disk once hydration lands', async () => {
    const { useStore } = await import('./useStore.js')
    useStore.getState().addTask({ title: 'typed before hydrate' })

    useStore.getState().hydrateState({ version: 7, tasks: [], notes: [], settings: {} })
    await flush()

    expect(await readStoredRaw()).toContain('typed before hydrate')
  })

  it('flushes a pre-hydration edit when the snapshot fails to load', async () => {
    const { useStore } = await import('./useStore.js')
    useStore.getState().addTask({ title: 'survives failed load' })

    useStore.getState().markHydrated()
    await flush()

    expect(await readStoredRaw()).toContain('survives failed load')
  })

  it('does not flush an empty membership list over the stored one', async () => {
    const { useStore } = await import('./useStore.js')

    useStore.getState().removeCollabMembership('t1')
    await flush()

    expect(await readStoredRaw()).toBe(null)
  })
})
