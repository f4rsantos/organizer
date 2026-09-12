import { inverseOfOp } from '@/lib/ai/agentOverlay'

const ENTITY_LIST_BY_TYPE = {
  task: 'tasks',
  event: 'events',
  note: 'notes',
  folder: 'folders',
  habit: 'habits',
  class: 'classes',
}

function entityListKey(entityType) {
  return ENTITY_LIST_BY_TYPE[entityType] ?? null
}

function applyCreate(entities, op) {
  if (op.entityType === 'kanbanCard') {
    return {
      ...entities,
      kanban: { cards: [...entities.kanban.cards, { id: op.id, ...op.entity }] },
    }
  }
  const key = entityListKey(op.entityType)
  if (!key) return entities
  return { ...entities, [key]: [...entities[key], { id: op.id, ...op.entity }] }
}

function applyUpdate(entities, op) {
  if (op.entityType === 'kanbanCard') {
    return {
      ...entities,
      kanban: {
        cards: entities.kanban.cards.map(card => (
          card.id === op.targetId ? { ...card, ...op.patch } : card
        )),
      },
    }
  }
  const key = entityListKey(op.entityType)
  if (!key) return entities
  return {
    ...entities,
    [key]: entities[key].map(item => (item.id === op.targetId ? { ...item, ...op.patch } : item)),
  }
}

function applyDelete(entities, op) {
  if (op.entityType === 'kanbanCard') {
    return {
      ...entities,
      kanban: { cards: entities.kanban.cards.filter(card => card.id !== op.targetId) },
    }
  }
  const key = entityListKey(op.entityType)
  if (!key) return entities
  return { ...entities, [key]: entities[key].filter(item => item.id !== op.targetId) }
}

export function applyOpToEntities(entities, op) {
  if (op.type === 'create') return applyCreate(entities, op)
  if (op.type === 'update') return applyUpdate(entities, op)
  if (op.type === 'delete') return applyDelete(entities, op)
  return entities
}

export function applyOpsToEntities(entities, ops) {
  return (ops ?? []).reduce((acc, op) => applyOpToEntities(acc, op), entities)
}

export function applyOpsToRun(run, ops) {
  if (!run) return run
  const inverses = (ops ?? []).map(inverseOfOp).filter(Boolean)
  return {
    ...run,
    ops: [...run.ops, ...ops],
    inverse: [...inverses.reverse(), ...run.inverse],
    entities: applyOpsToEntities(run.entities, ops),
  }
}
