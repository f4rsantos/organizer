export const AGENT_RUN_STATUSES = [
  'planning',
  'applying',
  'awaitingConfirm',
  'committed',
  'discarded',
  'interrupted',
  'failed',
]

export const AGENT_ENTITY_TYPES = [
  'task',
  'event',
  'note',
  'folder',
  'habit',
  'class',
  'kanbanCard',
  'gradeComponent',
]

export const AGENT_ACTION_TYPES = ['focusControl', 'notificationControl', 'updateSafeSettings']

export const AGENT_OP_TYPES = ['create', 'update', 'delete']

export function emptyRunEntities() {
  return {
    tasks: [],
    events: [],
    notes: [],
    kanban: { cards: [] },
    folders: [],
    habits: [],
    classes: [],
    gradeComponents: [],
  }
}

export function createAgentRun({ runId, scope, slot, model }) {
  return {
    id: runId,
    status: 'planning',
    scope: scope ?? null,
    slot: slot ?? null,
    model: model ?? null,
    ops: [],
    inverse: [],
    entities: emptyRunEntities(),
    createdAt: Date.now(),
  }
}

export function makeCreateOp({ entityType, id, entity }) {
  return { type: 'create', entityType, id, entity: entity ?? {} }
}

export function makeUpdateOp({ entityType, targetId, patch, priorPatch }) {
  return { type: 'update', entityType, targetId, patch: patch ?? {}, priorPatch: priorPatch ?? {} }
}

export function makeDeleteOp({ entityType, targetId, priorEntity }) {
  return { type: 'delete', entityType, targetId, priorEntity: priorEntity ?? null }
}

export function inverseOfOp(op) {
  if (!op || typeof op !== 'object') return null
  if (AGENT_ACTION_TYPES.includes(op.entityType)) return null
  if (op.type === 'create') {
    return makeDeleteOp({ entityType: op.entityType, targetId: op.id, priorEntity: op.entity })
  }
  if (op.type === 'delete') {
    return makeCreateOp({ entityType: op.entityType, id: op.targetId, entity: op.priorEntity ?? {} })
  }
  if (op.type === 'update') {
    return makeUpdateOp({
      entityType: op.entityType,
      targetId: op.targetId,
      patch: op.priorPatch ?? {},
      priorPatch: op.patch,
    })
  }
  return null
}

export function appendOpsToRun(run, ops) {
  if (!run) return run
  const inverses = ops.map(inverseOfOp).filter(Boolean)
  return {
    ...run,
    ops: [...run.ops, ...ops],
    inverse: [...inverses.reverse(), ...run.inverse],
  }
}

export function withRunStatus(run, status) {
  if (!run) return run
  return { ...run, status }
}

export function isInFlightStatus(status) {
  return status === 'planning' || status === 'applying'
}

export function interruptIfInFlight(run) {
  if (!run) return run
  if (!isInFlightStatus(run.status)) return run
  return { ...run, status: 'interrupted' }
}

export function dropEntities(run) {
  if (!run) return run
  return { ...run, entities: emptyRunEntities() }
}
