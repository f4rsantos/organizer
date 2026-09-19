import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resetStateDb } from './testStorage.js'

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

afterEach(() => {
  vi.unstubAllGlobals()
})

const lectureNote = overrides => ({
  id: 'lecture1', title: 'Lecture 4', kind: 'text', body: 'a week of notes',
  doc: null, strokes: [], favorite: false, archived: false, archivedAt: null,
  folderId: null, linkedEventKey: 'evt:2026-09-10', offlineOnly: true,
  order: 0, createdAt: 1, updatedAt: 2, ...overrides,
})

describe('mergeNotesOnImport', () => {
  it('keeps a local offline-only note the remote has never seen', async () => {
    const { mergeNotesOnImport } = await import('./useStore.js')
    const merged = mergeNotesOnImport(
      [lectureNote()],
      [{ id: 'remote1', title: 'synced' }],
    )
    expect(merged.map(n => n.id).sort()).toEqual(['lecture1', 'remote1'])
  })

  it('keeps the local copy when a stale remote record shares its id', async () => {
    const { mergeNotesOnImport } = await import('./useStore.js')
    const merged = mergeNotesOnImport(
      [lectureNote({ body: 'full lecture text' })],
      [lectureNote({ body: 'stale pre-toggle copy', offlineOnly: false })],
    )
    const note = merged.find(n => n.id === 'lecture1')
    expect(note.body).toBe('full lecture text')
    expect(note.offlineOnly).toBe(true)
    expect(merged.filter(n => n.id === 'lecture1')).toHaveLength(1)
  })

  it('lets remote win for notes that are not offline-only', async () => {
    const { mergeNotesOnImport } = await import('./useStore.js')
    const merged = mergeNotesOnImport(
      [{ id: 'n1', body: 'local', offlineOnly: false }],
      [{ id: 'n1', body: 'remote' }],
    )
    expect(merged.find(n => n.id === 'n1').body).toBe('remote')
  })

  it('tolerates missing note arrays', async () => {
    const { mergeNotesOnImport } = await import('./useStore.js')
    expect(mergeNotesOnImport(undefined, undefined)).toEqual([])
    expect(mergeNotesOnImport(null, [{ id: 'r' }])).toEqual([{ id: 'r' }])
  })
})

describe('importData with offline-only notes', () => {
  it('does not delete an offline-only note that remote still lists', async () => {
    const { useStore } = await import('./useStore.js')
    const { CURRENT_VERSION } = await import('./migrations.js')

    useStore.setState({ hydrated: true, notes: [lectureNote({ body: 'full lecture text' })] })

    useStore.getState().importData({
      version: CURRENT_VERSION,
      notes: [lectureNote({ body: 'stale pre-toggle copy', offlineOnly: false })],
    })

    const note = useStore.getState().notes.find(n => n.id === 'lecture1')
    expect(note).toBeDefined()
    expect(note.body).toBe('full lecture text')
    expect(note.offlineOnly).toBe(true)
  })

  it('preserves linkedEventKey through an import', async () => {
    const { useStore } = await import('./useStore.js')
    const { CURRENT_VERSION } = await import('./migrations.js')

    useStore.setState({ hydrated: true, notes: [] })
    useStore.getState().importData({
      version: CURRENT_VERSION,
      notes: [lectureNote({ offlineOnly: false })],
    })

    expect(useStore.getState().notes[0].linkedEventKey).toBe('evt:2026-09-10')
  })
})
