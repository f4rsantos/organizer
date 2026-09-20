import { describe, it, expect } from 'vitest'
import { summarizeOps, summaryPartsFromCounts, formatRunSummary, totalOpCount, describeOpRows } from '../../../src/apps/aiAssistant/runSummary'

const t = {
  aiSummaryNoteRetitled: undefined,
  aiSummaryNoteUpdated: '{count} note(s) updated',
  aiSummaryNoteCreated: '{count} note(s) created',
  aiSummaryFolderCreated: '{count} folder(s) created',
  aiSummaryTaskDeleted: '{count} task(s) removed',
  aiSummaryNoChanges: 'No changes',
  aiSummaryJoin: ', ',
}

describe('summarizeOps', () => {
  it('counts ops by entityType:type', () => {
    const ops = [
      { entityType: 'note', type: 'update' },
      { entityType: 'note', type: 'update' },
      { entityType: 'folder', type: 'create' },
    ]
    expect(summarizeOps(ops)).toEqual({ 'note:update': 2, 'folder:create': 1 })
  })

  it('counts distinct entity ids when multiple ops update the same entity', () => {
    const ops = [
      { entityType: 'kanbanCard', type: 'update', targetId: 'c1', patch: { columnId: 'col_done' } },
      { entityType: 'kanbanCard', type: 'update', targetId: 'c1', patch: { status: 'done' } },
      { entityType: 'kanbanCard', type: 'update', targetId: 'c1', patch: { order: 2 } },
    ]
    expect(summarizeOps(ops)).toEqual({ 'kanbanCard:update': 1 })
  })

  it('ignores malformed ops', () => {
    expect(summarizeOps([{}, null, { entityType: 'note' }, { type: 'create' }])).toEqual({})
  })

  it('returns empty object for empty input', () => {
    expect(summarizeOps([])).toEqual({})
    expect(summarizeOps(undefined)).toEqual({})
  })
})

describe('summaryPartsFromCounts', () => {
  it('formats each count using its locale template', () => {
    const parts = summaryPartsFromCounts({ 'note:update': 2, 'folder:create': 1 }, t)
    expect(parts).toEqual(['2 note(s) updated', '1 folder(s) created'])
  })

  it('skips entity/op combinations with no template', () => {
    const parts = summaryPartsFromCounts({ 'habit:delete': 1 }, t)
    expect(parts).toEqual([])
  })
})

describe('formatRunSummary', () => {
  it('joins formatted parts', () => {
    const ops = [
      { entityType: 'note', type: 'update' },
      { entityType: 'note', type: 'update' },
      { entityType: 'folder', type: 'create' },
      { entityType: 'task', type: 'delete' },
    ]
    expect(formatRunSummary(ops, t)).toBe('2 note(s) updated, 1 folder(s) created, 1 task(s) removed')
  })

  it('falls back to the no-changes string', () => {
    expect(formatRunSummary([], t)).toBe('No changes')
  })
})

describe('totalOpCount', () => {
  it('counts ops array length', () => {
    expect(totalOpCount([1, 2, 3])).toBe(3)
    expect(totalOpCount([])).toBe(0)
    expect(totalOpCount(null)).toBe(0)
  })
})

describe('describeOpRows with store lookup', () => {
  it('looks up title from store when op patch has no title', () => {
    const mockStore = {
      tasks: [{ id: 'k1', title: 'Finish history essay', views: { kanban: true } }],
    }
    const ops = [
      { entityType: 'kanbanCard', type: 'update', targetId: 'k1', patch: { columnId: 'col_done' } },
    ]
    const rows = describeOpRows(ops, { aiOpVerbUpdate: 'Updated' }, mockStore)
    expect(rows[0].label).toBe('Finish history essay')
  })
})

