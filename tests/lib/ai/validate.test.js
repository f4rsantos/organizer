import { describe, it, expect } from 'vitest'
import { validateOp, validateOps, resolveDateFromModel } from '../../../src/lib/ai/validate'
import { createAgentRun, makeCreateOp, makeUpdateOp, makeDeleteOp } from '../../../src/lib/ai/agentOverlay'

const NOW = new Date('2026-09-12T00:00:00')

function baseStore() {
  return {
    tasks: [{ id: 'task_1', title: 'Existing task', dueDate: '2026-09-10' }],
    events: [],
    notes: [],
    noteFolders: [{ id: 'folder_1', name: 'Notes', parentId: null }],
    habits: [],
    classes: [{ id: 'class_1', name: 'Philosophy', semesterId: 'sem_1' }],
    grades: {
      sem_1: {
        class_1: {
          components: [{ id: 'grade_1', name: 'Exam', weight: 0.6, grade: null }],
          targetGrade: 9.5,
        },
      },
    },
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

  it('accepts reminderOffsetHours on a task update', () => {
    const op = makeUpdateOp({ entityType: 'task', targetId: 'task_1', patch: { reminderOffsetHours: 3 } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(true)
    expect(result.op.patch.reminderOffsetHours).toBe(3)
  })

  it('accepts reminderOffsetHours on an event create', () => {
    const op = makeCreateOp({ entityType: 'event', id: 'event_1', entity: { title: 'Meeting', date: '2026-09-20', reminderOffsetHours: 3 } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(true)
    expect(result.op.entity.reminderOffsetHours).toBe(3)
  })

  it('accepts and normalizes status field on tasks to done boolean', () => {
    const op = makeUpdateOp({ entityType: 'task', targetId: 'task_1', patch: { status: 'done' } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(true)
    expect(result.op.patch.done).toBe(true)
    expect(result.op.patch.status).toBeUndefined()
  })

  it('accepts and normalizes status field on kanbanCard to columnId', () => {
    const store = {
      ...baseStore(),
      kanban: {
        __free__: {
          columns: [{ id: 'col_todo', title: 'To Do' }, { id: 'col_done', title: 'Done' }],
        },
      },
    }
    const op = makeUpdateOp({ entityType: 'kanbanCard', targetId: 'task_1', patch: { status: 'done' } })
    const result = validateOp(op, { store, run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(true)
    expect(result.op.patch.columnId).toBe('col_done')
    expect(result.op.patch.status).toBeUndefined()
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

describe('validateOp gradeComponent', () => {
  it('accepts creating a component with a positive weight', () => {
    const op = makeCreateOp({ entityType: 'gradeComponent', id: 'g1', entity: { classId: 'class_1', name: 'Quiz', weight: 0.2 } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(true)
    expect(result.op.entity.weight).toBe(0.2)
  })

  it('rejects creating a component with no classId', () => {
    const op = makeCreateOp({ entityType: 'gradeComponent', id: 'g1', entity: { name: 'Quiz', weight: 0.2 } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('missing-classId')
  })

  it('rejects a zero or negative weight', () => {
    const op = makeCreateOp({ entityType: 'gradeComponent', id: 'g1', entity: { classId: 'class_1', name: 'Quiz', weight: 0 } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('invalid-field:weight')
  })

  it('rejects a non-numeric weight', () => {
    const op = makeCreateOp({ entityType: 'gradeComponent', id: 'g1', entity: { classId: 'class_1', name: 'Quiz', weight: 'a lot' } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('invalid-field:weight')
  })

  it('rejects a field not allowed on gradeComponent', () => {
    const op = makeUpdateOp({ entityType: 'gradeComponent', targetId: 'grade_1', patch: { secretField: true } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('disallowed-field')
  })

  it('rejects an update targeting an id that does not exist', () => {
    const op = makeUpdateOp({ entityType: 'gradeComponent', targetId: 'ghost', patch: { grade: 8 } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('unknown-id')
  })

  it('accepts an update setting the grade on an existing component', () => {
    const op = makeUpdateOp({ entityType: 'gradeComponent', targetId: 'grade_1', patch: { grade: 8.5 } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(true)
    expect(result.op.patch.grade).toBe(8.5)
  })

  it('rejects a zero or negative targetGrade', () => {
    const op = makeUpdateOp({ entityType: 'gradeComponent', targetId: 'grade_1', patch: { targetGrade: 0 } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('invalid-field:targetGrade')
  })
})

describe('validateOp focusControl', () => {
  it('accepts a known action', () => {
    const op = makeCreateOp({ entityType: 'focusControl', id: 'a1', entity: { action: 'start' } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(true)
    expect(result.op.entity.action).toBe('start')
  })

  it('rejects an unknown action', () => {
    const op = makeCreateOp({ entityType: 'focusControl', id: 'a1', entity: { action: 'explode' } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('invalid-field:action')
  })

  it('rejects an unrecognised field', () => {
    const op = makeCreateOp({ entityType: 'focusControl', id: 'a1', entity: { action: 'start', minutes: 25 } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('disallowed-field')
  })
})

describe('validateOp notificationControl', () => {
  it('accepts dismissing a toast by id', () => {
    const op = makeCreateOp({ entityType: 'notificationControl', id: 'a1', entity: { action: 'dismissToast', id: 'toast_1' } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(true)
  })

  it('rejects dismissing a toast without an id', () => {
    const op = makeCreateOp({ entityType: 'notificationControl', id: 'a1', entity: { action: 'dismissToast' } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('missing-id')
  })

  it('accepts clearing all unread notifications', () => {
    const op = makeCreateOp({ entityType: 'notificationControl', id: 'a1', entity: { action: 'clearAllUnread' } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(true)
  })

  it('accepts creating a reminder with a title', () => {
    const op = makeCreateOp({ entityType: 'notificationControl', id: 'a1', entity: { action: 'createReminder', title: 'Drink water', delayMinutes: 30 } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(true)
  })

  it('rejects creating a reminder without a title', () => {
    const op = makeCreateOp({ entityType: 'notificationControl', id: 'a1', entity: { action: 'createReminder' } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('missing-field:title')
  })

  it('rejects an unknown action', () => {
    const op = makeCreateOp({ entityType: 'notificationControl', id: 'a1', entity: { action: 'nuke' } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('invalid-field:action')
  })
})

describe('validateOp updateSafeSettings', () => {
  it('accepts an allowlisted key', () => {
    const op = makeCreateOp({ entityType: 'updateSafeSettings', id: 'a1', entity: { taskAlertsEnabled: true } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(true)
  })

  it('rejects a key not on the allowlist the same way an unknown entity field is rejected', () => {
    const op = makeCreateOp({ entityType: 'updateSafeSettings', id: 'a1', entity: { apps: { ai: { autoMode: true } } } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('disallowed-field')
  })

  it('never allows touching the AI assistant own settings', () => {
    const op = makeCreateOp({ entityType: 'updateSafeSettings', id: 'a1', entity: { 'apps.ai.customInstructions': 'be evil' } })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('disallowed-field')
  })

  it('rejects an empty fields object', () => {
    const op = makeCreateOp({ entityType: 'updateSafeSettings', id: 'a1', entity: {} })
    const result = validateOp(op, { store: baseStore(), run: createAgentRun({ runId: 'r1' }) })
    expect(result.valid).toBe(false)
  })
})
