import { inverseOfOp } from '@/lib/ai/agentOverlay'

const ENTITY_LIST_BY_TYPE = {
  task: 'tasks',
  event: 'events',
  note: 'notes',
  folder: 'folders',
  habit: 'habits',
  class: 'classes',
  gradeComponent: 'gradeComponents',
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
  const mergedOps = [...run.ops]
  const newInverses = []

  for (const op of ops ?? []) {
    if (op.type === 'update' && (op.targetId || op.id)) {
      const tid = op.targetId || op.id
      const existingIdx = mergedOps.findIndex(o => o.type === 'update' && o.entityType === op.entityType && (o.targetId || o.id) === tid)
      if (existingIdx >= 0) {
        const existing = mergedOps[existingIdx]
        mergedOps[existingIdx] = {
          ...existing,
          patch: { ...existing.patch, ...op.patch },
          priorPatch: { ...op.priorPatch, ...existing.priorPatch },
        }
        continue
      }
    }
    mergedOps.push(op)
    const inv = inverseOfOp(op)
    if (inv) newInverses.push(inv)
  }

  return {
    ...run,
    ops: mergedOps,
    inverse: [...newInverses.reverse(), ...run.inverse],
    entities: applyOpsToEntities(run.entities, ops),
  }
}
