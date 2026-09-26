import { describe, it, expect } from 'vitest'
import { isSharedLocalHidden, applyAgentOverlay, buildAgentEntityId, parseAgentEntityId, removeSharedNote } from '../../../src/lib/collab/mergeUtils.js'

describe('isSharedLocalHidden', () => {
  it('returns false when the entity has no sharedRef', () => {
    expect(isSharedLocalHidden({ id: 't1' }, new Set(), {})).toBe(false)
  })

  it('returns false when the team is not active', () => {
    const entity = { id: 't1', sharedRef: { teamId: 'team1', sharedTaskId: 'r1' } }
    expect(isSharedLocalHidden(entity, new Set(), {})).toBe(false)
  })

  it('returns false when the team has a sync error', () => {
    const entity = { id: 't1', sharedRef: { teamId: 'team1', sharedTaskId: 'r1' } }
    const runtimeTeams = { team1: { syncStatus: 'error', state: { tasks: [{ id: 'r1' }] } } }
    expect(isSharedLocalHidden(entity, new Set(['team1']), runtimeTeams)).toBe(false)
  })

  it('returns true when the remote task still exists', () => {
    const entity = { id: 't1', sharedRef: { teamId: 'team1', sharedTaskId: 'r1' } }
    const runtimeTeams = { team1: { state: { tasks: [{ id: 'r1' }] } } }
    expect(isSharedLocalHidden(entity, new Set(['team1']), runtimeTeams)).toBe(true)
  })

  it('returns false when the remote task no longer exists', () => {
    const entity = { id: 't1', sharedRef: { teamId: 'team1', sharedTaskId: 'r1' } }
    const runtimeTeams = { team1: { state: { tasks: [] } } }
    expect(isSharedLocalHidden(entity, new Set(['team1']), runtimeTeams)).toBe(false)
  })

  it('checks kanban cards via sharedCardId', () => {
    const entity = { id: 't1', sharedRef: { teamId: 'team1', sharedCardId: 'c1' } }
    const runtimeTeams = { team1: { state: { kanban: { cards: [{ id: 'c1' }] } } } }
    expect(isSharedLocalHidden(entity, new Set(['team1']), runtimeTeams)).toBe(true)
  })

  it('checks events via sharedEventId', () => {
    const entity = { id: 't1', sharedRef: { teamId: 'team1', sharedEventId: 'e1' } }
    const runtimeTeams = { team1: { state: { events: [{ id: 'e1' }] } } }
    expect(isSharedLocalHidden(entity, new Set(['team1']), runtimeTeams)).toBe(true)
  })
})

describe('buildAgentEntityId / parseAgentEntityId', () => {
  it('round trips a run id and local id', () => {
    const id = buildAgentEntityId('run1', 'local1')
    expect(id).toBe('agent:run1:local1')
    expect(parseAgentEntityId(id)).toEqual({ runId: 'run1', localId: 'local1' })
  })

  it('returns null for a non agent-prefixed id', () => {
    expect(parseAgentEntityId('shared:team1:abc')).toBe(null)
    expect(parseAgentEntityId('plain-id')).toBe(null)
    expect(parseAgentEntityId(null)).toBe(null)
  })

  it('returns null when the prefix has no local-id separator', () => {
    expect(parseAgentEntityId('agent:run1')).toBe(null)
  })
})

describe('applyAgentOverlay', () => {
  const baseEntities = [
    { id: 't1', title: 'Task one' },
    { id: 't2', title: 'Task two' },
    { id: 't3', title: 'Task three' },
  ]

  it('returns the same array reference when there is no active run', () => {
    const result = applyAgentOverlay(baseEntities, null, 'task')
    expect(result).toBe(baseEntities)
  })

  it('returns the same array reference when the run has no ops', () => {
    const result = applyAgentOverlay(baseEntities, { id: 'run1', ops: [] }, 'task')
    expect(result).toBe(baseEntities)
  })

  it('returns the same array reference when ops target a different entityType', () => {
    const run = { id: 'run1', ops: [{ type: 'create', entityType: 'note', id: 'n1', entity: { title: 'x' } }] }
    const result = applyAgentOverlay(baseEntities, run, 'task')
    expect(result).toBe(baseEntities)
  })

  it('appends a create op with an agent-prefixed id and agentMeta', () => {
    const run = {
      id: 'run1',
      ops: [{ type: 'create', entityType: 'task', id: 'local1', entity: { title: 'New task' } }],
    }
    const result = applyAgentOverlay(baseEntities, run, 'task')
    expect(result).toHaveLength(4)
    const created = result[3]
    expect(created.id).toBe('agent:run1:local1')
    expect(created.title).toBe('New task')
    expect(created.agentMeta).toEqual({ runId: 'run1', op: 'create', baseId: null })
  })

  it('replaces a matching entity in place on update, preserving position and real id', () => {
    const run = {
      id: 'run1',
      ops: [{ type: 'update', entityType: 'task', targetId: 't2', patch: { title: 'Updated title' } }],
    }
    const result = applyAgentOverlay(baseEntities, run, 'task')
    expect(result).toHaveLength(3)
    expect(result[1].id).toBe('t2')
    expect(result[1].title).toBe('Updated title')
    expect(result[1].agentMeta).toEqual({ runId: 'run1', op: 'update', baseId: 't2' })
    expect(result[0]).toBe(baseEntities[0])
    expect(result[2]).toBe(baseEntities[2])
  })

  it('keeps a deleted entity visible and marks it instead of removing it', () => {
    const run = {
      id: 'run1',
      ops: [{ type: 'delete', entityType: 'task', targetId: 't1' }],
    }
    const result = applyAgentOverlay(baseEntities, run, 'task')
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('t1')
    expect(result[0].agentMeta).toEqual({ runId: 'run1', op: 'delete', baseId: 't1' })
  })

  it('skips an op targeting an id that does not exist, without throwing', () => {
    const run = {
      id: 'run1',
      ops: [{ type: 'update', entityType: 'task', targetId: 'missing', patch: { title: 'x' } }],
    }
    expect(() => applyAgentOverlay(baseEntities, run, 'task')).not.toThrow()
    const result = applyAgentOverlay(baseEntities, run, 'task')
    expect(result).toEqual(baseEntities)
  })

  it('never mutates the input array', () => {
    const snapshot = baseEntities.map(entity => ({ ...entity }))
    const run = {
      id: 'run1',
      ops: [
        { type: 'update', entityType: 'task', targetId: 't1', patch: { title: 'changed' } },
        { type: 'delete', entityType: 'task', targetId: 't2' },
        { type: 'create', entityType: 'task', id: 'local1', entity: { title: 'new' } },
      ],
    }
    applyAgentOverlay(baseEntities, run, 'task')
    expect(baseEntities).toEqual(snapshot)
  })

  it('applies create, update and delete ops together', () => {
    const run = {
      id: 'run1',
      ops: [
        { type: 'update', entityType: 'task', targetId: 't1', patch: { title: 'changed' } },
        { type: 'delete', entityType: 'task', targetId: 't2' },
        { type: 'create', entityType: 'task', id: 'local1', entity: { title: 'new' } },
      ],
    }
    const result = applyAgentOverlay(baseEntities, run, 'task')
    expect(result).toHaveLength(4)
    expect(result[0]).toMatchObject({ id: 't1', title: 'changed', agentMeta: { op: 'update' } })
    expect(result[1]).toMatchObject({ id: 't2', agentMeta: { op: 'delete' } })
    expect(result[2]).toBe(baseEntities[2])
    expect(result[3]).toMatchObject({ id: 'agent:run1:local1', title: 'new', agentMeta: { op: 'create' } })
  })

  it('applies an agent op to a team entity without discarding its sharedMeta', () => {
    const merged = [
      { id: 't1', title: 'Local' },
      { id: 'shared:team1:r1', title: 'Remote', sharedMeta: { teamId: 'team1', sharedTaskId: 'r1', remote: true } },
    ]
    const run = {
      id: 'run1',
      ops: [{ type: 'update', entityType: 'task', targetId: 'shared:team1:r1', patch: { title: 'Retitled' } }],
    }

    const result = applyAgentOverlay(merged, run, 'task')

    expect(result[1]).toMatchObject({
      id: 'shared:team1:r1',
      title: 'Retitled',
      sharedMeta: { teamId: 'team1', remote: true },
      agentMeta: { op: 'update', baseId: 'shared:team1:r1' },
    })
  })
})

describe('removeSharedNote', () => {
  it('drops only the matching note and keeps the rest of the team state', () => {
    const state = {
      tasks: [{ id: 't1' }],
      notes: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }],
    }
    expect(removeSharedNote(state, 'a')).toEqual({
      tasks: [{ id: 't1' }],
      notes: [{ id: 'b', title: 'B' }],
    })
  })

  it('does not mutate the input state', () => {
    const notes = [{ id: 'a' }]
    const state = { notes }
    removeSharedNote(state, 'a')
    expect(state.notes).toBe(notes)
    expect(notes).toHaveLength(1)
  })

  it('is a no-op for an unknown id', () => {
    expect(removeSharedNote({ notes: [{ id: 'a' }] }, 'zzz').notes).toEqual([{ id: 'a' }])
  })

  it('tolerates missing notes and null entries', () => {
    expect(removeSharedNote({}, 'a')).toEqual({ notes: [] })
    expect(removeSharedNote(null, 'a')).toEqual({ notes: [] })
    expect(removeSharedNote({ notes: [null, { id: 'b' }] }, 'b').notes).toEqual([null])
  })
})
