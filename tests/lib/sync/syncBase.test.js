import { describe, it, expect } from 'vitest'
import { createSyncBase, hasUnsyncedChanges, syncBaseFor, syncedContentChanged } from '../../../src/lib/sync/syncBase.js'

describe('syncBaseFor', () => {
  it('ignores a base recorded for another Firebase project', () => {
    const base = createSyncBase('project-a', { tasks: [] })
    expect(syncBaseFor(base, 'project-a')).toEqual(base.slices)
    expect(syncBaseFor(base, 'project-b')).toBeNull()
    expect(syncBaseFor(null, 'project-a')).toBeNull()
  })
})

describe('hasUnsyncedChanges', () => {
  const synced = { tasks: [{ id: 't1' }], notes: [{ id: 'n1' }] }

  it('is false right after a sync', () => {
    expect(hasUnsyncedChanges(createSyncBase('p', synced), 'p', synced)).toBe(false)
  })

  it('is true after a local edit', () => {
    const edited = { ...synced, tasks: [{ id: 't1', done: true }] }
    expect(hasUnsyncedChanges(createSyncBase('p', synced), 'p', edited)).toBe(true)
  })

  it('ignores offline-only notes, which never sync', () => {
    const withOffline = { ...synced, notes: [...synced.notes, { id: 'n2', offlineOnly: true }] }
    expect(hasUnsyncedChanges(createSyncBase('p', synced), 'p', withOffline)).toBe(false)
  })

  it('is true when there is no base for this project', () => {
    expect(hasUnsyncedChanges(null, 'p', synced)).toBe(true)
  })
})

describe('syncedContentChanged', () => {
  const state = { tasks: [], theme: 'dark', syncBase: null, activeTab: 'tasks' }

  it('ignores device-only and transient changes', () => {
    expect(syncedContentChanged({ ...state, syncBase: { scope: 'p' } }, state)).toBe(false)
    expect(syncedContentChanged({ ...state, activeTab: 'notes' }, state)).toBe(false)
  })

  it('detects synced slice and meta changes', () => {
    expect(syncedContentChanged({ ...state, tasks: [{ id: 't' }] }, state)).toBe(true)
    expect(syncedContentChanged({ ...state, theme: 'light' }, state)).toBe(true)
  })
})
