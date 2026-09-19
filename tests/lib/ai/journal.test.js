import { describe, it, expect } from 'vitest'
import {
  buildJournalEntry, pushJournalEntry, isInverseOpApplicable, isRunUndoable,
  nextUndoableEntry, isLifoUndoTarget, markEntryUndoable, removeJournalEntry,
  emptyJournal, JOURNAL_RING_CAPACITY,
} from '../../../src/lib/ai/journal'
import { createAgentRun, makeCreateOp, makeUpdateOp, makeDeleteOp, appendOpsToRun } from '../../../src/lib/ai/agentOverlay'

function runWith(ops) {
  return appendOpsToRun(createAgentRun({ runId: 'r1', slot: 'a', model: 'sonnet' }), ops)
}

describe('buildJournalEntry / pushJournalEntry', () => {
  it('records what ran, when, slot, model, request count, and change summary', () => {
    const run = runWith([makeCreateOp({ entityType: 'task', id: 't1', entity: { title: 'x' } })])
    const entry = buildJournalEntry({ run, requestCount: 3, changeSummary: { 'task:create': 1 } })
    expect(entry.runId).toBe('r1')
    expect(entry.slot).toBe('a')
    expect(entry.model).toBe('sonnet')
    expect(entry.requestCount).toBe(3)
    expect(entry.changeSummary).toEqual({ 'task:create': 1 })
    expect(entry.undoable).toBe(true)
    expect(typeof entry.ranAt).toBe('number')
  })

  it('inverse of a committed create op is a delete, recorded on the entry', () => {
    const run = runWith([makeCreateOp({ entityType: 'task', id: 't1', entity: { title: 'x' } })])
    const entry = buildJournalEntry({ run })
    expect(entry.inverse).toEqual([{ type: 'delete', entityType: 'task', targetId: 't1', priorEntity: { title: 'x' } }])
  })

  it('inverse of a committed delete op is a create restoring the prior entity', () => {
    const run = runWith([makeDeleteOp({ entityType: 'task', targetId: 't1', priorEntity: { title: 'x' } })])
    const entry = buildJournalEntry({ run })
    expect(entry.inverse).toEqual([{ type: 'create', entityType: 'task', id: 't1', entity: { title: 'x' } }])
  })

  it('inverse of a committed update restores prior values exactly', () => {
    const run = runWith([makeUpdateOp({ entityType: 'task', targetId: 't1', patch: { title: 'new' }, priorPatch: { title: 'old' } })])
    const entry = buildJournalEntry({ run })
    expect(entry.inverse).toEqual([{ type: 'update', entityType: 'task', targetId: 't1', patch: { title: 'old' }, priorPatch: { title: 'new' } }])
  })
})

describe('ring buffer capacity', () => {
  it('drops the 11th oldest entry, keeping only the last 10', () => {
    let journal = emptyJournal()
    for (let i = 0; i < 11; i++) {
      journal = pushJournalEntry(journal, buildJournalEntry({ run: runWith([]) , changeSummary: { i } }))
    }
    expect(journal.entries).toHaveLength(JOURNAL_RING_CAPACITY)
    expect(journal.entries[0].changeSummary.i).toBe(10)
    expect(journal.entries.some(e => e.changeSummary.i === 0)).toBe(false)
  })
})

describe('LIFO undo order', () => {
  it('offers the most recently pushed undoable entry first', () => {
    const first = buildJournalEntry({ run: { ...runWith([]), id: 'first' } })
    const second = buildJournalEntry({ run: { ...runWith([]), id: 'second' } })
    let journal = pushJournalEntry(emptyJournal(), first)
    journal = pushJournalEntry(journal, second)
    expect(nextUndoableEntry(journal).runId).toBe('second')
    expect(isLifoUndoTarget(journal, 'second')).toBe(true)
    expect(isLifoUndoTarget(journal, 'first')).toBe(false)
  })
})

describe('invalidated inverse ops', () => {
  it('marks a run not undoable when the create-inverse target no longer exists', () => {
    const op = makeDeleteOp({ entityType: 'task', targetId: 'gone', priorEntity: null })
    expect(isInverseOpApplicable(op, { tasks: [] })).toBe(false)
  })

  it('refuses a create-inverse when an entity with that id already exists again', () => {
    const inverseCreate = { type: 'create', entityType: 'task', entity: { id: 't1', title: 'restored' } }
    const store = { tasks: [{ id: 't1', title: 'user recreated this' }] }
    expect(isInverseOpApplicable(inverseCreate, store)).toBe(false)
  })

  it('allows a create-inverse when the entity is genuinely gone', () => {
    const inverseCreate = { type: 'create', entityType: 'task', entity: { id: 't1', title: 'restored' } }
    expect(isInverseOpApplicable(inverseCreate, { tasks: [] })).toBe(true)
  })

  it('marks a run not undoable when the update-inverse expects values later edited manually', () => {
    const inverseUpdate = { type: 'update', entityType: 'task', targetId: 't1', patch: { title: 'old title' } }
    const store = { tasks: [{ id: 't1', title: 'a manually edited title' }] }
    expect(isInverseOpApplicable(inverseUpdate, store)).toBe(false)
  })

  it('isRunUndoable is false when any inverse op is no longer applicable', () => {
    const run = {
      inverse: [
        { type: 'delete', entityType: 'task', targetId: 'missing' },
      ],
    }
    expect(isRunUndoable(run, { tasks: [] })).toBe(false)
  })

  it('isRunUndoable is true when every inverse op still applies', () => {
    const run = {
      inverse: [
        { type: 'delete', entityType: 'task', targetId: 't1' },
      ],
    }
    expect(isRunUndoable(run, { tasks: [{ id: 't1' }] })).toBe(true)
  })

  it('markEntryUndoable flips undoable without applying anything', () => {
    let journal = pushJournalEntry(emptyJournal(), buildJournalEntry({ run: runWith([]) }))
    journal = markEntryUndoable(journal, 'r1', false)
    expect(journal.entries[0].undoable).toBe(false)
  })
})

describe('removeJournalEntry', () => {
  it('removes the entry for a given run id', () => {
    let journal = pushJournalEntry(emptyJournal(), buildJournalEntry({ run: runWith([]) }))
    journal = removeJournalEntry(journal, 'r1')
    expect(journal.entries).toHaveLength(0)
  })
})
