import { describe, it, expect } from 'vitest'
import {
  createAgentRun, makeCreateOp, makeUpdateOp, makeDeleteOp, inverseOfOp,
  appendOpsToRun, withRunStatus, interruptIfInFlight, dropEntities, emptyRunEntities,
} from './agentOverlay'

describe('createAgentRun', () => {
  it('starts in planning with empty ops, inverse, and entities', () => {
    const run = createAgentRun({ runId: 'r1', scope: { type: 'global' }, slot: 'a', model: 'sonnet' })
    expect(run.id).toBe('r1')
    expect(run.status).toBe('planning')
    expect(run.ops).toEqual([])
    expect(run.inverse).toEqual([])
    expect(run.entities).toEqual(emptyRunEntities())
  })
})

describe('inverseOfOp', () => {
  it('inverses create into delete carrying the original entity', () => {
    const op = makeCreateOp({ entityType: 'task', id: 't1', entity: { title: 'Buy milk' } })
    const inverse = inverseOfOp(op)
    expect(inverse).toEqual({ type: 'delete', entityType: 'task', targetId: 't1', priorEntity: { title: 'Buy milk' } })
  })

  it('inverses delete into create restoring the prior entity', () => {
    const op = makeDeleteOp({ entityType: 'task', targetId: 't1', priorEntity: { title: 'Buy milk' } })
    const inverse = inverseOfOp(op)
    expect(inverse).toEqual({ type: 'create', entityType: 'task', id: 't1', entity: { title: 'Buy milk' } })
  })

  it('inverses update into update with prior values restored exactly', () => {
    const op = makeUpdateOp({
      entityType: 'task',
      targetId: 't1',
      patch: { title: 'New title' },
      priorPatch: { title: 'Old title' },
    })
    const inverse = inverseOfOp(op)
    expect(inverse).toEqual({
      type: 'update',
      entityType: 'task',
      targetId: 't1',
      patch: { title: 'Old title' },
      priorPatch: { title: 'New title' },
    })
  })
})

describe('appendOpsToRun', () => {
  it('appends ops and prepends their inverses in reverse order', () => {
    const run = createAgentRun({ runId: 'r1' })
    const op1 = makeCreateOp({ entityType: 'task', id: 't1', entity: {} })
    const op2 = makeCreateOp({ entityType: 'task', id: 't2', entity: {} })
    const next = appendOpsToRun(run, [op1, op2])
    expect(next.ops).toEqual([op1, op2])
    expect(next.inverse.map(o => o.targetId)).toEqual(['t2', 't1'])
  })
})

describe('withRunStatus', () => {
  it('returns a new run object with the status replaced', () => {
    const run = createAgentRun({ runId: 'r1' })
    const next = withRunStatus(run, 'awaitingConfirm')
    expect(next.status).toBe('awaitingConfirm')
    expect(run.status).toBe('planning')
  })
})

describe('interruptIfInFlight', () => {
  it('marks a planning run as interrupted', () => {
    const run = createAgentRun({ runId: 'r1' })
    expect(interruptIfInFlight(run).status).toBe('interrupted')
  })

  it('marks an applying run as interrupted', () => {
    const run = withRunStatus(createAgentRun({ runId: 'r1' }), 'applying')
    expect(interruptIfInFlight(run).status).toBe('interrupted')
  })

  it('leaves an awaitingConfirm run untouched', () => {
    const run = withRunStatus(createAgentRun({ runId: 'r1' }), 'awaitingConfirm')
    expect(interruptIfInFlight(run).status).toBe('awaitingConfirm')
  })

  it('leaves a committed run untouched', () => {
    const run = withRunStatus(createAgentRun({ runId: 'r1' }), 'committed')
    expect(interruptIfInFlight(run).status).toBe('committed')
  })
})

describe('dropEntities', () => {
  it('resets entities to empty without touching ops', () => {
    const run = { ...createAgentRun({ runId: 'r1' }), entities: { tasks: [{ id: 't1' }], events: [], notes: [], kanban: { cards: [] }, folders: [] } }
    const next = dropEntities(run)
    expect(next.entities).toEqual(emptyRunEntities())
    expect(next.ops).toBe(run.ops)
  })
})
