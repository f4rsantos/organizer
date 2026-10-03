import { describe, it, expect } from 'vitest'
import { resolveSeriesFolder } from '../../../src/lib/notes/eventFolder.js'

describe('resolveSeriesFolder', () => {
  it('keeps one-off events at the root', () => {
    const folders = [{ id: 'a', name: 'Math', parentId: null }]
    expect(resolveSeriesFolder(folders, null, 'Math')).toEqual({ folders, folderId: null })
  })

  it('reuses the folder linked to the same series', () => {
    const folders = [{ id: 'a', name: 'Renamed', parentId: null, linkedSeriesKey: 'event:1' }]
    expect(resolveSeriesFolder(folders, 'event:1', 'Math')).toEqual({ folders, folderId: 'a' })
  })

  it('reuses an existing folder named after the class for another series', () => {
    const folders = [{ id: 'a', name: 'Math', parentId: null, linkedSeriesKey: 'event:1' }]
    const result = resolveSeriesFolder(folders, 'event:2', 'Math')
    expect(result.folderId).toBe('a')
    expect(result.folders).toHaveLength(1)
  })

  it('matches a hand-made folder ignoring case and whitespace', () => {
    const folders = [{ id: 'a', name: '  math ', parentId: null }]
    expect(resolveSeriesFolder(folders, 'event:1', 'Math').folderId).toBe('a')
  })

  it('prefers a top-level folder over a nested one with the same name', () => {
    const folders = [
      { id: 'nested', name: 'Math', parentId: 'sem' },
      { id: 'top', name: 'Math', parentId: null },
    ]
    expect(resolveSeriesFolder(folders, 'event:1', 'Math').folderId).toBe('top')
  })

  it('falls back to a nested folder when no top-level one matches', () => {
    const folders = [{ id: 'nested', name: 'Math', parentId: 'sem' }]
    expect(resolveSeriesFolder(folders, 'event:1', 'Math').folderId).toBe('nested')
  })

  it('creates a linked folder when nothing matches', () => {
    const folders = [{ id: 'a', name: 'Physics', parentId: null, order: 0 }]
    const result = resolveSeriesFolder(folders, 'event:1', 'Math')
    expect(result.folders).toHaveLength(2)
    const created = result.folders.find(f => f.id === result.folderId)
    expect(created).toMatchObject({ name: 'Math', parentId: null, linkedSeriesKey: 'event:1', order: -1 })
  })
})
