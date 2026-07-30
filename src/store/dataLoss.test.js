import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const STORAGE_KEY = 'f4rsantos.github.io/organizer'
const BACKUP_KEY = 'f4rsantos.github.io/organizer:pre-slice-backup'
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

const legacyState = () => ({
  version: 7, theme: 'dark', lang: 'pt', onboardingDone: true,
  tasks: [{ id: 't1', title: 'precious data' }],
  notes: [{ id: 'n1', title: 'also precious' }],
  settings: { passThreshold: 9.5 },
})

async function settle() {
  await new Promise(resolve => setTimeout(resolve, 60))
}

describe('a legacy plaintext install is migrated, not discarded', () => {
  it('reads the old format on boot', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState()))
    const { loadState } = await import('./persist.js')
    expect(loadState().tasks[0].title).toBe('precious data')
  })

  it('keeps the data after the first write upgrades the format', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState()))
    const { loadState, saveState } = await import('./persist.js')

    const loaded = loadState()
    saveState(loaded)
    await settle()

    expect(JSON.parse(storage.getItem(STORAGE_KEY)).format).toBe('blue-tangerine')
    expect(loadState().tasks[0].title).toBe('precious data')
    expect(loadState().notes[0].title).toBe('also precious')
  })

  it('backs the old blob up before overwriting it', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState()))
    const { loadState, saveState, readBackup } = await import('./persist.js')

    saveState(loadState())
    await settle()

    expect(readBackup().tasks[0].title).toBe('precious data')
  })

  it('does not overwrite an existing backup on later writes', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState()))
    const { loadState, saveState, readBackup } = await import('./persist.js')

    saveState(loadState())
    await settle()
    const first = JSON.stringify(readBackup())

    saveState({ ...loadState(), tasks: [] })
    await settle()
    expect(JSON.stringify(readBackup())).toBe(first)
  })
})

describe('containers written under the old format name still load', () => {
  it('reads a legacy named container', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({
      format: 'organizer-sliced-1',
      meta: { version: 6, theme: 'dark', lang: 'pt', onboardingDone: true },
      rev: 3,
      slices: { tasks: { plain: [{ id: 't1', title: 'precious data' }] } },
    }))
    const { loadState } = await import('./persist.js')
    expect(loadState().tasks[0].title).toBe('precious data')
  })

  it('rewrites it under the current name without losing data', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({
      format: 'organizer-sliced-1',
      meta: { version: 6, theme: 'dark', lang: 'pt', onboardingDone: true },
      rev: 3,
      slices: { tasks: { plain: [{ id: 't1', title: 'precious data' }] } },
    }))
    const { loadState, saveState } = await import('./persist.js')
    saveState(loadState())
    await settle()
    expect(JSON.parse(storage.getItem(STORAGE_KEY)).format).toBe('blue-tangerine')
    expect(loadState().tasks[0].title).toBe('precious data')
  })
})

describe('a legacy encrypted install is migrated, not discarded', () => {
  it('reads a whole-state envelope through the async loader', async () => {
    const { encryptForSlot, aadForLocalSlice, WHOLE_STATE } = await import('../lib/crypto/index.js')
    const envelope = await encryptForSlot(legacyState(), KEY, aadForLocalSlice(WHOLE_STATE))
    storage.setItem(STORAGE_KEY, JSON.stringify(envelope))
    storage.setItem(KEY_STORAGE_KEY, KEY)
    storage.setItem(ENABLED_FLAG_KEY, '1')

    const { loadStateAsync } = await import('./persist.js')
    const loaded = await loadStateAsync()
    expect(loaded.tasks[0].title).toBe('precious data')
  })

  it('gates the render so the sync loader never wins with defaults', async () => {
    const { encryptForSlot, aadForLocalSlice, WHOLE_STATE } = await import('../lib/crypto/index.js')
    const envelope = await encryptForSlot(legacyState(), KEY, aadForLocalSlice(WHOLE_STATE))
    storage.setItem(STORAGE_KEY, JSON.stringify(envelope))
    storage.setItem(KEY_STORAGE_KEY, KEY)

    const { hasEncryptedSnapshot, loadState } = await import('./persist.js')
    expect(hasEncryptedSnapshot()).toBe(true)
    expect(loadState()).toBe(null)
  })
})

describe('unreadable data is never overwritten', () => {
  it('refuses to write when the key is missing', async () => {
    storage.setItem(KEY_STORAGE_KEY, KEY)
    storage.setItem(ENABLED_FLAG_KEY, '1')
    const { saveState } = await import('./persist.js')
    saveState(legacyState())
    await settle()
    const encrypted = storage.getItem(STORAGE_KEY)

    storage.removeItem(KEY_STORAGE_KEY)
    vi.resetModules()
    const second = await import('./persist.js')
    expect(await second.loadStateAsync()).toBe(null)

    second.saveState({ ...legacyState(), tasks: [] })
    await settle()
    expect(storage.getItem(STORAGE_KEY)).toBe(encrypted)
  })

  it('reports why writes are blocked', async () => {
    storage.setItem(KEY_STORAGE_KEY, KEY)
    storage.setItem(ENABLED_FLAG_KEY, '1')
    const first = await import('./persist.js')
    first.saveState(legacyState())
    await settle()

    storage.removeItem(KEY_STORAGE_KEY)
    vi.resetModules()
    const second = await import('./persist.js')
    await second.loadStateAsync()
    expect(second.getWriteBlockReason()).toBe('encryption-key-required')
  })

  it('blocks writes when a container holds an unreadable slice', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({
      format: 'blue-tangerine',
      meta: { version: 7 },
      slices: { tasks: { iv: 'not-real', ciphertext: 'not-real' } },
    }))
    const { loadStateAsync, saveState } = await import('./persist.js')
    const before = storage.getItem(STORAGE_KEY)

    expect(await loadStateAsync()).toBe(null)

    saveState(legacyState())
    await settle()
    expect(storage.getItem(STORAGE_KEY)).toBe(before)
  })

  it('blocks writes when the stored state cannot be migrated', async () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({
      format: 'blue-tangerine',
      meta: { version: 999 },
      slices: { tasks: { plain: [{ id: 't1', title: 'from the future' }] } },
    }))
    const { loadState, getLoadWarnings } = await import('./persist.js')
    loadState()
    expect(getLoadWarnings()).toContain('newer-version')
  })
})
