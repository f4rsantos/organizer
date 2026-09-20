import { describe, it, expect } from 'vitest'
import { emptyRunEntities, createAgentRun, makeCreateOp, makeUpdateOp, makeDeleteOp } from '@/lib/ai/agentOverlay'
import { applyOpToEntities, applyOpsToEntities, applyOpsToRun } from '../../../src/lib/ai/apply'

describe('applyOpToEntities', () => {
  it('creates a task into entities.tasks', () => {
    const op = makeCreateOp({ entityType: 'task', id: 't1', entity: { title: 'Essay' } })
    const entities = applyOpToEntities(emptyRunEntities(), op)
    expect(entities.tasks).toEqual([{ id: 't1', title: 'Essay' }])
  })

  it('creates a kanban card into entities.kanban.cards', () => {
    const op = makeCreateOp({ entityType: 'kanbanCard', id: 'k1', entity: { title: 'Card', columnId: 'todo' } })
    const entities = applyOpToEntities(emptyRunEntities(), op)
    expect(entities.kanban.cards).toEqual([{ id: 'k1', title: 'Card', columnId: 'todo' }])
  })

  it('updates an existing entity by merging the patch', () => {
    const base = { ...emptyRunEntities(), tasks: [{ id: 't1', title: 'Essay', done: false }] }
    const op = makeUpdateOp({ entityType: 'task', targetId: 't1', patch: { done: true } })
    const entities = applyOpToEntities(base, op)
    expect(entities.tasks).toEqual([{ id: 't1', title: 'Essay', done: true }])
  })

  it('deletes an entity by id', () => {
    const base = { ...emptyRunEntities(), notes: [{ id: 'n1', title: 'X' }] }
    const op = makeDeleteOp({ entityType: 'note', targetId: 'n1', priorEntity: { id: 'n1', title: 'X' } })
    const entities = applyOpToEntities(base, op)
    expect(entities.notes).toEqual([])
  })
})

describe('applyOpsToEntities', () => {
  it('applies a batch of ops in order', () => {
    const ops = [
      makeCreateOp({ entityType: 'task', id: 't1', entity: { title: 'A' } }),
      makeUpdateOp({ entityType: 'task', targetId: 't1', patch: { title: 'B' } }),
    ]
    const entities = applyOpsToEntities(emptyRunEntities(), ops)
    expect(entities.tasks).toEqual([{ id: 't1', title: 'B' }])
  })
})

describe('applyOpsToRun', () => {
  it('writes into the run overlay entities, not local state', () => {
    const run = createAgentRun({ runId: 'r1', scope: null, slot: 'medium', model: 'x' })
    const op = makeCreateOp({ entityType: 'task', id: 't1', entity: { title: 'Essay' } })
    const next = applyOpsToRun(run, [op])
    expect(next.entities.tasks).toEqual([{ id: 't1', title: 'Essay' }])
    expect(run.entities.tasks).toEqual([])
  })

  it('captures the inverse of each applied op', () => {
    const run = createAgentRun({ runId: 'r1', scope: null, slot: 'medium', model: 'x' })
    const op = makeCreateOp({ entityType: 'task', id: 't1', entity: { title: 'Essay' } })
    const next = applyOpsToRun(run, [op])
    expect(next.inverse).toEqual([{ type: 'delete', entityType: 'task', targetId: 't1', priorEntity: { title: 'Essay' } }])
  })

  it('captures update inverses using priorPatch', () => {
    const run = createAgentRun({ runId: 'r1', scope: null, slot: 'medium', model: 'x' })
    const op = makeUpdateOp({ entityType: 'task', targetId: 't1', patch: { done: true }, priorPatch: { done: false } })
    const next = applyOpsToRun(run, [op])
    expect(next.inverse).toEqual([
      { type: 'update', entityType: 'task', targetId: 't1', patch: { done: false }, priorPatch: { done: true } },
    ])
  })

  it('renders a proposed class into the overlay so a structural change is never invisible', () => {
    const run = createAgentRun({ runId: 'r1', scope: null, slot: 'medium', model: 'x' })
    const op = makeCreateOp({ entityType: 'class', id: 'c1', entity: { name: 'Philosophy' } })
    const next = applyOpsToRun(run, [op])
    expect(next.entities.classes).toEqual([{ id: 'c1', name: 'Philosophy' }])
  })

  it('renders a proposed habit into the overlay', () => {
    const run = createAgentRun({ runId: 'r1', scope: null, slot: 'medium', model: 'x' })
    const op = makeCreateOp({ entityType: 'habit', id: 'h1', entity: { title: 'Read daily' } })
    const next = applyOpsToRun(run, [op])
    expect(next.entities.habits).toEqual([{ id: 'h1', title: 'Read daily' }])
  })

  it('renders a proposed grade component into the overlay', () => {
    const run = createAgentRun({ runId: 'r1', scope: null, slot: 'medium', model: 'x' })
    const op = makeCreateOp({ entityType: 'gradeComponent', id: 'g1', entity: { classId: 'class_1', name: 'Quiz', weight: 0.2 } })
    const next = applyOpsToRun(run, [op])
    expect(next.entities.gradeComponents).toEqual([{ id: 'g1', classId: 'class_1', name: 'Quiz', weight: 0.2 }])
  })

  it('leaves entities untouched for a focusControl action op', () => {
    const run = createAgentRun({ runId: 'r1', scope: null, slot: 'medium', model: 'x' })
    const op = makeCreateOp({ entityType: 'focusControl', id: 'a1', entity: { action: 'start' } })
    const next = applyOpsToRun(run, [op])
    expect(next.ops).toEqual([op])
    expect(next.entities).toEqual(run.entities)
  })

  it('appends new ops after existing ones and prepends new inverses', () => {
    const run = createAgentRun({ runId: 'r1', scope: null, slot: 'medium', model: 'x' })
    const first = makeCreateOp({ entityType: 'task', id: 't1', entity: { title: 'A' } })
    const afterFirst = applyOpsToRun(run, [first])
    const second = makeCreateOp({ entityType: 'task', id: 't2', entity: { title: 'B' } })
    const afterSecond = applyOpsToRun(afterFirst, [second])
    expect(afterSecond.ops.map(o => o.id)).toEqual(['t1', 't2'])
    expect(afterSecond.inverse.map(o => o.targetId)).toEqual(['t2', 't1'])
  })

  it('merges consecutive update ops for the same targetId', () => {
    const run = createAgentRun({ runId: 'r1', scope: null, slot: 'medium', model: 'x' })
    const first = makeUpdateOp({ entityType: 'kanbanCard', targetId: 'k1', patch: { columnId: 'col_done' }, priorPatch: { columnId: 'col_todo' } })
    const afterFirst = applyOpsToRun(run, [first])
    const second = makeUpdateOp({ entityType: 'kanbanCard', targetId: 'k1', patch: { order: 3 }, priorPatch: { order: 0 } })
    const afterSecond = applyOpsToRun(afterFirst, [second])
    expect(afterSecond.ops.length).toBe(1)
    expect(afterSecond.ops[0].patch).toEqual({ columnId: 'col_done', order: 3 })
    expect(afterSecond.ops[0].priorPatch).toEqual({ order: 0, columnId: 'col_todo' })
  })
})
