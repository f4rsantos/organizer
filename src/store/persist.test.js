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
    _map: map,
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
  version: 7,
  theme: 'system',
  lang: 'en',
  onboardingDone: true,
  tasks: [{ id: 't1', title: 'secret plan' }],
  notes: [],
  settings: {},
})

// crypto.subtle resolves over several ticks, so wait for the write to land
// rather than assuming a single macrotask is enough.
async function flush() {
  for (let i = 0; i < 50; i++) {
    await new Promise(resolve => setTimeout(resolve, 2))
    if (storage.getItem(STORAGE_KEY) !== null) return
  }
}

describe('plaintext persistence when no key is set', () => {
  it('writes readable JSON', async () => {
    const { saveState } = await import('./persist.js')
    saveState(baseState())
    expect(storage.getItem(STORAGE_KEY)).toContain('secret plan')
  })

  it('loads the plaintext blob back', async () => {
    const { saveState, loadState } = await import('./persist.js')
    saveState(baseState())
    expect(loadState().tasks[0].title).toBe('secret plan')
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
    expect(storage.getItem(STORAGE_KEY)).not.toContain('secret plan')
  })

  it('writes an encryption envelope', async () => {
    const { saveState } = await import('./persist.js')
    saveState(baseState())
    await flush()
    const stored = JSON.parse(storage.getItem(STORAGE_KEY))
    expect(stored).toMatchObject({ version: 1 })
    expect(typeof stored.ciphertext).toBe('string')
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
    expect(storage.getItem(STORAGE_KEY)).toBe(null)
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

describe('the size cap is measured on plaintext', () => {
  it('keeps a large but under-cap state intact after encryption', async () => {
    storage.setItem(KEY_STORAGE_KEY, KEY)
    storage.setItem(ENABLED_FLAG_KEY, '1')

    const heavy = baseState()
    // ~3.4 MB of UTF-16 payload: under the 4.8 MB cap as plaintext, but over it
    // once base64 inflates the ciphertext by roughly a third.
    heavy.tasks = [{ id: 't1', title: 'secret plan', note: 'x'.repeat(1_700_000) }]

    const { saveState, loadStateAsync } = await import('./persist.js')
    saveState(heavy)
    await flush()

    const loaded = await loadStateAsync()
    expect(loaded.tasks).toHaveLength(1)
  })
})
