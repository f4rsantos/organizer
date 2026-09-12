import { describe, it, expect } from 'vitest'
import { validateOp, validateOps, resolveDateFromModel } from './validate'
import { createAgentRun, makeCreateOp, makeUpdateOp, makeDeleteOp } from './agentOverlay'

const NOW = new Date('2026-09-12T00:00:00')

function baseStore() {
  return {
    tasks: [{ id: 'task_1', title: 'Existing task', dueDate: '2026-09-10' }],
    events: [],
    notes: [],
    noteFolders: [{ id: 'folder_1', name: 'Notes', parentId: null }],
    habits: [],
    classes: [],
  }
}

describe('resolveDateFromModel', () => {
  it('resolves a recognizable relative date phrase', () => {
    expect(resolveDateFromModel('next tuesday', { now: NOW })).toBe('2026-09-22')
  })

  it('accepts an ISO date, the format a model is most likely to emit', () => {
    expect(resolveDateFromModel('2026-09-08', { now: NOW })).toBe('2026-09-08')
  })

  it('rejects an ISO-shaped string that is not a real date', () => {
    expect(resolveDateFromModel('2026-02-31', { now: NOW })).toBeNull()
    expect(resolveDateFromModel('2026-13-01', { now: NOW })).toBeNull()
  })

  it('returns null for unparseable text', () => {
    expect(resolveDateFromModel('flibbertigibbet nonsense', { now: NOW })).toBeNull()
  })

  it('returns null for empty text', () => {
    expect(resolveDateFromModel('', { now: NOW })).toBeNull()
  })
})

describe('validateOp id checks', () => {
  it('rejects a hallucinated id not present in the store or run', () => {
    const op = makeUpdateOp({ entityType: 'task', targetId: 'class_xyz', patch: { title: 'x' } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('unknown-id')
  })

  it('accepts an id created earlier in the same run as a later target', () => {
    const run = createAgentRun({ runId: 'r1' })
    const createOp = makeCreateOp({ entityType: 'task', id: 'local_1', entity: { title: 'New task' } })
    const runAfterCreate = { ...run, ops: [createOp] }
    const updateOp = makeUpdateOp({ entityType: 'task', targetId: 'local_1', patch: { title: 'Renamed' } })
    const result = validateOp(updateOp, { store: baseStore(), run: runAfterCreate })
    expect(result.valid).toBe(true)
  })
})

describe('validateOp scope checks', () => {
  it('rejects an op outside the run declared folder scope', () => {
    const scope = { type: 'folder', folderId: 'folder_1' }
    const op = makeCreateOp({ entityType: 'note', id: 'note_1', entity: { title: 'x', folderId: 'folder_2' } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }), scope })
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('out-of-scope')
  })

  it('accepts an op inside the declared folder scope', () => {
    const scope = { type: 'folder', folderId: 'folder_1' }
    const op = makeCreateOp({ entityType: 'note', id: 'note_1', entity: { title: 'x', folderId: 'folder_1' } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }), scope })
    expect(result.valid).toBe(true)
  })
})

describe('validateOp type and field checks', () => {
  it('rejects an unknown entity type', () => {
    const op = makeCreateOp({ entityType: 'widget', id: 'w1', entity: {} })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('unknown-entity-type')
  })

  it('rejects a field not allowed for that entity type', () => {
    const op = makeUpdateOp({ entityType: 'task', targetId: 'task_1', patch: { secretField: true } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('disallowed-field')
  })
})

describe('validateOp date resolution', () => {
  it('resolves a model-supplied date string through the parser rather than trusting it', () => {
    const op = makeUpdateOp({ entityType: 'task', targetId: 'task_1', patch: { dueDate: 'next tuesday' } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }), context: { now: NOW } })
    expect(result.valid).toBe(true)
    expect(result.op.patch.dueDate).toBe('2026-09-22')
  })

  it('rejects an op whose date string the parser cannot resolve', () => {
    const op = makeUpdateOp({ entityType: 'task', targetId: 'task_1', patch: { dueDate: 'not a real date' } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }), context: { now: NOW } })
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('unresolved-date')
  })
})

describe('validateOps batch', () => {
  it('reports both accepted and rejected ops without throwing', () => {
    const good = makeCreateOp({ entityType: 'task', id: 'local_1', entity: { title: 'Ok' } })
    const bad = makeUpdateOp({ entityType: 'task', targetId: 'ghost_id', patch: { title: 'x' } })
    const result = validateOps([good, bad], { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.accepted).toHaveLength(1)
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0].reason).toBe('unknown-id')
  })

  it('allows a delete op created earlier in the same batch to target that new id', () => {
    const create = makeCreateOp({ entityType: 'task', id: 'local_1', entity: { title: 'Ok' } })
    const del = makeDeleteOp({ entityType: 'task', targetId: 'local_1' })
    const result = validateOps([create, del], { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(true)
    expect(result.accepted).toHaveLength(2)
  })
})
