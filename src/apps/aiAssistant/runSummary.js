const ENTITY_LABEL_KEYS = {
  task: { create: 'aiSummaryTaskCreated', update: 'aiSummaryTaskUpdated', delete: 'aiSummaryTaskDeleted' },
  event: { create: 'aiSummaryEventCreated', update: 'aiSummaryEventUpdated', delete: 'aiSummaryEventDeleted' },
  note: { create: 'aiSummaryNoteCreated', update: 'aiSummaryNoteUpdated', delete: 'aiSummaryNoteDeleted' },
  folder: { create: 'aiSummaryFolderCreated', update: 'aiSummaryFolderUpdated', delete: 'aiSummaryFolderDeleted' },
  habit: { create: 'aiSummaryHabitCreated', update: 'aiSummaryHabitUpdated', delete: 'aiSummaryHabitDeleted' },
  class: { create: 'aiSummaryClassCreated', update: 'aiSummaryClassUpdated', delete: 'aiSummaryClassDeleted' },
  kanbanCard: { create: 'aiSummaryCardCreated', update: 'aiSummaryCardUpdated', delete: 'aiSummaryCardDeleted' },
}

export function summarizeOps(ops) {
  const counts = {}
  const seen = {}
  for (const op of ops ?? []) {
    if (!op?.entityType || !op?.type) continue
    const key = `${op.entityType}:${op.type}`
    const id = op.targetId ?? op.id
    if (id) {
      if (!seen[key]) seen[key] = new Set()
      if (seen[key].has(id)) continue
      seen[key].add(id)
    }
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

export function summaryPartsFromCounts(counts, t) {
  return Object.entries(counts ?? {})
    .map(([key, count]) => {
      const [entityType, opType] = key.split(':')
      const labelKey = ENTITY_LABEL_KEYS[entityType]?.[opType]
      const template = labelKey ? t?.[labelKey] : null
      if (!template) return null
      return template.replace('{count}', count)
    })
    .filter(Boolean)
}

export function formatRunSummary(ops, t) {
  const parts = summaryPartsFromCounts(summarizeOps(ops), t)
  if (!parts.length) return t?.aiSummaryNoChanges ?? ''
  return parts.join(t?.aiSummaryJoin ?? ', ')
}

export function totalOpCount(ops) {
  return (ops ?? []).length
}

const OP_VERB_KEYS = { create: 'aiOpVerbCreate', update: 'aiOpVerbUpdate', delete: 'aiOpVerbDelete' }

function lookupEntityTitle(store, entityType, id) {
  if (!store || !id) return ''
  if (entityType === 'task' || entityType === 'kanbanCard') {
    const task = (store.tasks ?? []).find(item => item.id === id)
    if (task?.title) return task.title
  }
  if (entityType === 'note') {
    const note = (store.notes ?? []).find(item => item.id === id)
    if (note?.title) return note.title
  }
  if (entityType === 'event') {
    const event = (store.events ?? []).find(item => item.id === id)
    if (event?.title) return event.title
  }
  if (entityType === 'folder') {
    const folder = (store.noteFolders ?? []).find(item => item.id === id)
    if (folder?.name) return folder.name
  }
  if (entityType === 'habit') {
    const habit = (store.habits ?? []).find(item => item.id === id)
    if (habit?.title ?? habit?.name) return habit.title ?? habit.name
  }
  if (entityType === 'class') {
    const cl = (store.classes ?? []).find(item => item.id === id)
    if (cl?.name) return cl.name
  }
  return ''
}

function opEntityLabel(op, store) {
  const targetId = op.targetId ?? op.id
  if (op.type === 'create') return op.entity?.title ?? op.entity?.name ?? op.entity?.text ?? ''
  if (op.type === 'delete') {
    return op.priorEntity?.title ?? op.priorEntity?.name ?? op.priorEntity?.text ?? lookupEntityTitle(store, op.entityType, targetId) ?? ''
  }
  return op.patch?.title ?? op.patch?.name ?? op.patch?.text ?? op.priorEntity?.title ?? lookupEntityTitle(store, op.entityType, targetId) ?? ''
}

export function describeOpRow(op, t, store) {
  const verb = t?.[OP_VERB_KEYS[op?.type]] ?? op?.type ?? ''
  const label = opEntityLabel(op ?? {}, store)
  return { id: op?.targetId ?? op?.id ?? null, entityType: op?.entityType ?? null, verb, label }
}

export function describeOpRows(ops, t, store) {
  return (ops ?? []).map(op => describeOpRow(op, t, store))
}

const REJECTION_REASON_KEYS = {
  'unknown-id': 'aiRejectUnknownId',
  'unknown-entity-type': 'aiRejectUnknownEntityType',
  'unknown-op-type': 'aiRejectUnknownOpType',
  'missing-id': 'aiRejectMissingId',
  'malformed-op': 'aiRejectMalformedOp',
  'out-of-scope': 'aiRejectOutOfScope',
}

function rejectionReasonLabel(reason, t) {
  if (typeof reason !== 'string') return t?.aiRejectUnknown ?? ''
  if (reason.startsWith('disallowed-field:')) {
    return (t?.aiRejectDisallowedField ?? '').replace('{fields}', reason.slice('disallowed-field:'.length))
  }
  if (reason.startsWith('unresolved-date:')) {
    return (t?.aiRejectUnresolvedDate ?? '').replace('{field}', reason.slice('unresolved-date:'.length))
  }
  return t?.[REJECTION_REASON_KEYS[reason]] ?? t?.aiRejectUnknown ?? reason
}

export function describeRejectedOps(rejected, t, store) {
  return (rejected ?? []).map(({ op, reason }) => ({
    ...describeOpRow(op, t, store),
    reason: rejectionReasonLabel(reason, t),
  }))
}

export function describeRunError(error, t, store) {
  if (!error) return { message: t?.aiStatusFailed ?? '', rejected: [] }
  const kind = typeof error === 'string' ? error : error.kind
  const rejected = describeRejectedOps(error.rejected, t, store)

  if (kind === 'no-slot-configured') return { message: t?.aiErrorNoSlot ?? '', rejected }
  if (kind === 'budget-exhausted') return { message: t?.aiErrorBudget ?? '', rejected }
  if (kind === 'rateLimit') return { message: t?.aiErrorRateLimit ?? '', rejected }
  if (kind === 'validation' || kind === 'validation-no-high-slot' || kind === 'validation-after-escalation') {
    return { message: t?.aiErrorValidation ?? '', rejected }
  }
  return { message: t?.aiStatusFailed ?? '', rejected }
}
