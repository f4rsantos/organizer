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
    _map: map,
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
  version: 7,
  theme: 'system',
  lang: 'en',
  onboardingDone: true,
  tasks: [{ id: 't1', title: 'secret plan' }],
  notes: [],
  settings: {},
})

async function flush(predicate) {
  for (let i = 0; i < 60; i++) {
    await new Promise(resolve => setTimeout(resolve, 2))
    const raw = await readStoredRaw()
    if (raw !== null && (!predicate || predicate(raw))) return
  }
}

describe('plaintext persistence when no key is set', () => {
  it('writes readable JSON', async () => {
    const { saveState } = await import('./persist.js')
    saveState(baseState())
    await flush()
    expect(await readStoredRaw()).toContain('secret plan')
  })

  it('loads the plaintext blob back', async () => {
    const { saveState, loadStateAsync } = await import('./persist.js')
    saveState(baseState())
    await flush()
    expect((await loadStateAsync()).tasks[0].title).toBe('secret plan')
  })

  it('returns null when nothing is stored', async () => {
    const { loadState } = await import('./persist.js')
    expect(loadState()).toBe(null)
  })
})

describe('encrypted persistence when a key is set', () => {
  beforeEach(() => {
    storage.setItem(KEY_STORAGE_KEY, KEY)
    storage.setItem(ENABLED_FLAG_KEY, '1')
  })

  it('does not write readable plaintext', async () => {
    const { saveState } = await import('./persist.js')
    saveState(baseState())
    await flush()
    expect(await readStoredRaw()).not.toContain('secret plan')
  })

  it('writes a sliced container of envelopes', async () => {
    const { saveState } = await import('./persist.js')
    saveState(baseState())
    await flush()
    const stored = JSON.parse(await readStoredRaw())
    expect(stored).toMatchObject({ format: 'blue-tangerine' })
    expect(stored.slices.tasks).toMatchObject({ version: 1 })
    expect(typeof stored.slices.tasks.ciphertext).toBe('string')
  })

  it('keeps the metadata readable outside the ciphertext', async () => {
    const { saveState } = await import('./persist.js')
    saveState(baseState())
    await flush()
    expect(JSON.parse(await readStoredRaw()).meta)
      .toMatchObject({ version: 7, theme: 'system', lang: 'en', onboardingDone: true })
  })

  it('round trips through the async loader', async () => {
    const { saveState, loadStateAsync } = await import('./persist.js')
    saveState(baseState())
    await flush()
    const loaded = await loadStateAsync()
    expect(loaded.tasks[0].title).toBe('secret plan')
  })

  it('the synchronous loader refuses an envelope', async () => {
    const { saveState, loadState } = await import('./persist.js')
    saveState(baseState())
    await flush()
    expect(loadState()).toBe(null)
  })
})

describe('a missing key never downgrades to plaintext', () => {
  it('skips the write when encryption was previously enabled', async () => {
    storage.setItem(ENABLED_FLAG_KEY, '1')
    const { saveState } = await import('./persist.js')
    saveState(baseState())
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(await readStoredRaw()).toBe(null)
  })

  it('reports a key requirement instead of returning data', async () => {
    storage.setItem(KEY_STORAGE_KEY, KEY)
    storage.setItem(ENABLED_FLAG_KEY, '1')
    const { saveState } = await import('./persist.js')
    saveState(baseState())
    await flush()

    storage.removeItem(KEY_STORAGE_KEY)
    vi.resetModules()
    const { loadStateAsync, getLoadWarnings } = await import('./persist.js')
    expect(await loadStateAsync()).toBe(null)
    expect(getLoadWarnings()).toContain('encryption-key-required')
  })
})

describe('legacy plaintext installs keep working', () => {
  it('loads an unencrypted blob when no key exists', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(baseState()))
    const { loadStateAsync } = await import('./persist.js')
    const loaded = await loadStateAsync()
    expect(loaded.tasks[0].title).toBe('secret plan')
  })
})

describe('large states are stored whole', () => {
  it('keeps a large encrypted state intact', async () => {
    storage.setItem(KEY_STORAGE_KEY, KEY)
    storage.setItem(ENABLED_FLAG_KEY, '1')

    const heavy = baseState()
    heavy.tasks = [{ id: 't1', title: 'secret plan', note: 'x'.repeat(1_700_000) }]

    const { saveState, loadStateAsync } = await import('./persist.js')
    saveState(heavy)
    await flush()

    const loaded = await loadStateAsync()
    expect(loaded.tasks).toHaveLength(1)
    expect(loaded.tasks[0].note).toHaveLength(1_700_000)
  })

  it('keeps state past the old localStorage cap', async () => {
    const heavy = baseState()
    heavy.taskAlertStates = { a1: { pad: 'x'.repeat(6_000_000) } }
    heavy.tasks = [{ id: 't1', title: 'secret plan' }]

    const { saveState, loadStateAsync } = await import('./persist.js')
    saveState(heavy)
    await flush()

    const stored = JSON.parse(await readStoredRaw())
    expect(stored.omitted ?? []).toHaveLength(0)

    const loaded = await loadStateAsync()
    expect(loaded.taskAlertStates.a1.pad).toHaveLength(6_000_000)
    expect(loaded.tasks).toHaveLength(1)
  })

  it('keeps canvas notes instead of dropping them', async () => {
    const heavy = baseState()
    const strokes = Array.from({ length: 20_000 }, (_, i) => ({ x: i, y: i, pad: 'x'.repeat(200) }))
    heavy.notes = [
      { id: 'n1', kind: 'canvas', strokes },
      { id: 'n2', kind: 'text', body: 'keep me' },
    ]

    const { saveState, loadStateAsync } = await import('./persist.js')
    saveState(heavy)
    await flush()

    const loaded = await loadStateAsync()
    expect(loaded.notes).toHaveLength(2)
    expect(loaded.notes[0].strokes).toHaveLength(20_000)
  })
})

describe('only changed slices are re-encrypted', () => {
  beforeEach(() => {
    storage.setItem(KEY_STORAGE_KEY, KEY)
    storage.setItem(ENABLED_FLAG_KEY, '1')
  })

  it('reuses the stored envelope for untouched slices', async () => {
    const { saveState } = await import('./persist.js')
    const first = baseState()
    saveState(first)
    await flush()
    const before = JSON.parse(await readStoredRaw())

    saveState({ ...first, tasks: [{ id: 't2', title: 'new plan' }] })
    await flush(raw => JSON.parse(raw).slices.tasks.ciphertext !== before.slices.tasks.ciphertext)
    const after = JSON.parse(await readStoredRaw())

    expect(after.slices.tasks.ciphertext).not.toBe(before.slices.tasks.ciphertext)
    expect(after.slices.settings.ciphertext).toBe(before.slices.settings.ciphertext)
    expect(after.slices.notes.ciphertext).toBe(before.slices.notes.ciphertext)
  })

  it('skips the write entirely when nothing changed', async () => {
    const { saveState } = await import('./persist.js')
    const state = baseState()
    saveState(state)
    await flush()
    const before = await readStoredRaw()

    saveState(state)
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(await readStoredRaw()).toBe(before)
  })

  it('rewrites the container on every real write', async () => {
    const { saveState } = await import('./persist.js')
    const state = baseState()
    saveState(state)
    await flush()
    const before = await readStoredRaw()

    saveState({ ...state, tasks: [] })
    await flush(raw => raw !== before)
    expect(await readStoredRaw()).not.toBe(before)
  })

  it('retries a slice whose encryption failed', async () => {
    const { saveState } = await import('./persist.js')
    const encrypt = crypto.subtle.encrypt.bind(crypto.subtle)
    const spy = vi.spyOn(crypto.subtle, 'encrypt')
      .mockRejectedValueOnce(new Error('boom'))

    saveState(baseState())
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(await readStoredRaw()).toBe(null)

    spy.mockImplementation(encrypt)
    saveState(baseState())
    await flush()
    expect(JSON.parse(await readStoredRaw()).slices.tasks).toBeTruthy()
    spy.mockRestore()
  })
})

describe('concurrent writes do not clobber each other', () => {
  it('leaves the latest state stored', async () => {
    storage.setItem(KEY_STORAGE_KEY, KEY)
    storage.setItem(ENABLED_FLAG_KEY, '1')

    const { saveState, loadStateAsync } = await import('./persist.js')
    saveState({ ...baseState(), tasks: [{ id: 't1', title: 'first' }] })
    saveState({ ...baseState(), tasks: [{ id: 't2', title: 'second' }] })
    await flush()
    await new Promise(resolve => setTimeout(resolve, 30))

    const loaded = await loadStateAsync()
    expect(loaded.tasks[0].title).toBe('second')
  })
})

describe('transient fields never reach storage', () => {
  it('omits ui-only keys from the container', async () => {
    const { saveState } = await import('./persist.js')
    saveState({
      ...baseState(),
      activeTab: 'tasks',
      resetSignal: 42,
      hydrated: true,
      collabRuntime: { teams: { t1: {} } },
    })
    await flush()

    const raw = await readStoredRaw()
    expect(raw).not.toContain('activeTab')
    expect(raw).not.toContain('resetSignal')
    expect(raw).not.toContain('collabRuntime')
    expect(raw).not.toContain('hydrated')
  })
})
