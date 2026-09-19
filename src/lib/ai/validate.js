import { tokenize } from '@/lib/parser/tokenizer'
import { Pipeline } from '@/lib/parser/Pipeline'
import { DateParser } from '@/lib/parser/parsers/DateParser'
import { getLocalePack } from '@/lib/parser/locales/index'
import { format, isValid } from 'date-fns'
import { AGENT_ENTITY_TYPES, AGENT_OP_TYPES } from './agentOverlay'
import { markdownToDocForAgent } from './markdown'
import { docToPlainText } from '@/lib/notes/noteExport'

const datePipeline = new Pipeline([new DateParser()])

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function resolveIsoDate(text) {
  const match = ISO_DATE_RE.exec(text)
  if (!match) return null
  const [, year, month, day] = match
  const candidate = new Date(Number(year), Number(month) - 1, Number(day))
  if (!isValid(candidate)) return null
  if (candidate.getMonth() !== Number(month) - 1 || candidate.getDate() !== Number(day)) return null
  return format(candidate, 'yyyy-MM-dd')
}

export function resolveDateFromModel(text, context = {}) {
  if (typeof text !== 'string' || !text.trim()) return null
  const iso = resolveIsoDate(text.trim())
  if (iso) return iso
  const tokens = tokenize(text)
  if (!tokens.length) return null
  const now = context.now || new Date()
  const locale = context.locale || getLocalePack(context.lang)
  const matches = datePipeline.execute(tokens, { ...context, now, locale })
  const best = matches[0]
  const date = best?.value?.date
  if (!date || !isValid(date)) return null
  return format(date, 'yyyy-MM-dd')
}

const DATE_FIELDS_BY_TYPE = {
  task: ['dueDate'],
  event: ['date', 'startDate', 'endDate'],
  note: [],
  folder: [],
  habit: ['targetDate'],
  class: [],
  kanbanCard: ['dueDate'],
}

const ALLOWED_FIELDS_BY_TYPE = {
  task: [
    'title', 'notes', 'dueDate', 'done', 'priority', 'classId', 'recurrence',
    'weekStart', 'weekEnd', 'eisenhower', 'status', 'columnId', 'kanban',
    'reminderOffsetHours',
  ],
  event: [
    'title', 'note', 'date', 'startDate', 'endDate', 'allDay', 'color',
    'startTime', 'endTime', 'semesterId', 'reminderOffsetHours',
  ],
  note: ['title', 'body', 'folderId', 'favorite', 'archived', 'status'],
  folder: ['name', 'parentId'],
  habit: [
    'title', 'cadenceDays', 'weekdays', 'requireNote', 'color', 'tone',
    'customMessage', 'targetKind', 'targetCount', 'targetDate',
  ],
  class: ['name', 'color', 'ects', 'professor'],
  kanbanCard: ['title', 'columnId', 'order', 'checklist', 'notes', 'priority', 'dueDate', 'classId', 'semesterId', 'status'],
}

export function resolveKanbanColumnId(value, store) {
  if (!value || typeof value !== 'string') return value
  const boardId = store?.activeSemesterId ?? '__free__'
  const columns = store?.kanban?.[boardId]?.columns ?? []
  if (!columns.length) return value

  const norm = value.trim().toLowerCase()
  const byId = columns.find(c => c.id?.toLowerCase() === norm)
  if (byId) return byId.id

  const byTitle = columns.find(c => c.title?.toLowerCase() === norm)
  if (byTitle) return byTitle.id

  const subTitle = columns.find(c => c.title?.toLowerCase().includes(norm))
  if (subTitle) return subTitle.id

  if (norm === 'done' || norm === 'completed' || norm === 'finish') {
    const doneCol = columns.find(c => c.id?.toLowerCase().includes('done') || c.title?.toLowerCase().includes('done')) ?? columns[columns.length - 1]
    if (doneCol) return doneCol.id
  }
  if (norm === 'todo' || norm === 'to do' || norm === 'to-do') {
    const todoCol = columns.find(c => c.id?.toLowerCase().includes('todo') || c.title?.toLowerCase().includes('to do')) ?? columns[0]
    if (todoCol) return todoCol.id
  }
  if (norm === 'in progress' || norm === 'doing' || norm === 'progress') {
    const progCol = columns.find(c => c.id?.toLowerCase().includes('prog') || c.title?.toLowerCase().includes('progress'))
    if (progCol) return progCol.id
  }

  return value
}

function isKnownType(entityType) {
  return AGENT_ENTITY_TYPES.includes(entityType)
}

function resolveDatesInObject(entityType, obj, context) {
  const dateFields = DATE_FIELDS_BY_TYPE[entityType] ?? []
  if (!dateFields.length) return { value: obj, unresolvedDateField: null }
  const resolved = { ...obj }
  for (const field of dateFields) {
    if (!(field in resolved)) continue
    const value = resolved[field]
    if (value == null) continue
    const date = resolveDateFromModel(value, context)
    if (date === null) return { value: obj, unresolvedDateField: field }
    resolved[field] = date
  }
  return { value: resolved, unresolvedDateField: null }
}

function collectKnownIds(store, entityType) {
  const ids = new Set()
  const source = {
    task: store?.tasks,
    event: store?.events,
    note: store?.notes,
    folder: store?.noteFolders,
    habit: store?.habits,
    class: store?.classes,
    kanbanCard: store?.tasks,
  }[entityType]
  for (const item of source ?? []) {
    if (item?.id) ids.add(item.id)
  }
  return ids
}

function collectRunCreatedIds(run, entityType) {
  const ids = new Set()
  for (const op of run?.ops ?? []) {
    if (op.entityType !== entityType) continue
    if (op.type === 'create') ids.add(op.id)
    if (op.type === 'delete') ids.delete(op.targetId)
  }
  return ids
}

function idExists(id, entityType, store, run) {
  const known = collectKnownIds(store, entityType)
  if (known.has(id)) return true
  const created = collectRunCreatedIds(run, entityType)
  return created.has(id)
}

function isInScope(op, scope) {
  if (!scope || scope.type === 'global') return true
  const targetId = op.type === 'create' ? op.id : op.targetId
  const fieldsForScope = op.type === 'create' ? op.entity : op.patch
  if (scope.type === 'folder') {
    if (op.entityType === 'folder') return targetId === scope.folderId || fieldsForScope?.parentId === scope.folderId
    if (op.entityType === 'note') {
      if (op.type === 'create') return fieldsForScope?.folderId === scope.folderId
      return true
    }
    return true
  }
  if (Array.isArray(scope.ids) && scope.ids.length) {
    if (op.type === 'create') return true
    return scope.ids.includes(targetId)
  }
  return true
}

function unknownFields(entityType, obj) {
  const allowed = ALLOWED_FIELDS_BY_TYPE[entityType] ?? []
  return Object.keys(obj ?? {}).filter(key => !allowed.includes(key))
}

export function validateOp(op, { store, run, scope, context = {} } = {}) {
  if (!op || typeof op !== 'object') return { valid: false, reason: 'malformed-op' }
  if (!AGENT_OP_TYPES.includes(op.type)) return { valid: false, reason: 'unknown-op-type' }
  if (!isKnownType(op.entityType)) return { valid: false, reason: 'unknown-entity-type' }

  const targetId = op.type === 'create' ? op.id : op.targetId
  if (!targetId || typeof targetId !== 'string') return { valid: false, reason: 'missing-id' }

  if (op.type !== 'create' && !idExists(targetId, op.entityType, store, run)) {
    return { valid: false, reason: 'unknown-id' }
  }

  if (!isInScope(op, scope)) return { valid: false, reason: 'out-of-scope' }

  if (op.type === 'delete') return { valid: true, op }

  const rawPayload = op.type === 'create' ? (op.entity ?? {}) : (op.patch ?? {})
  const payload = { ...rawPayload }

  if (op.entityType === 'task') {
    if (payload.status !== undefined) {
      const s = String(payload.status).toLowerCase()
      if (s === 'done' || s === 'completed' || payload.status === true) {
        payload.done = true
      } else if (s === 'todo' || s === 'pending' || payload.status === false) {
        payload.done = false
      }
      const matchedCol = resolveKanbanColumnId(String(payload.status), store)
      if (matchedCol && matchedCol !== String(payload.status)) {
        payload.columnId = matchedCol
        payload.kanban = { columnId: matchedCol }
      }
      delete payload.status
    }
    if (payload.columnId) {
      payload.columnId = resolveKanbanColumnId(payload.columnId, store)
      payload.kanban = { columnId: payload.columnId }
    }
  }

  if (op.entityType === 'kanbanCard') {
    if (payload.status !== undefined && !payload.columnId) {
      payload.columnId = resolveKanbanColumnId(String(payload.status), store)
      delete payload.status
    } else if (payload.columnId) {
      payload.columnId = resolveKanbanColumnId(payload.columnId, store)
    }
  }

  // Coerce common Gemini field-name variations for notes before validation
  if (op.entityType === 'note') {
    if (payload.content !== undefined && payload.body === undefined) {
      payload.body = payload.content
      delete payload.content
    }
    if (payload.text !== undefined && payload.body === undefined) {
      payload.body = payload.text
      delete payload.text
    }
  }

  const badFields = unknownFields(op.entityType, payload)
  if (badFields.length) {
    // For notes, strip unknown fields rather than aborting — the body content is the real work
    if (op.entityType === 'note') {
      for (const f of badFields) delete payload[f]
    } else {
      return { valid: false, reason: `disallowed-field:${badFields.join(',')}` }
    }
  }

  const { value: resolvedPayload, unresolvedDateField } = resolveDatesInObject(op.entityType, payload, context)
  if (unresolvedDateField) return { valid: false, reason: `unresolved-date:${unresolvedDateField}` }

  const resolvedOp = op.type === 'create'
    ? { ...op, entity: resolvedPayload }
    : { ...op, patch: resolvedPayload }

  // Convert note body from Markdown (what we sent the model) back to ProseMirror doc
  if (op.entityType === 'note' && resolvedOp.patch?.body !== undefined) {
    const markdownBody = resolvedOp.patch.body
    if (typeof markdownBody === 'string' && markdownBody.trim()) {
      try {
        const { doc } = markdownToDocForAgent(markdownBody)
        const plainText = docToPlainText(doc)
        const updatedPatch = { ...resolvedOp.patch, body: plainText, doc }
        return { valid: true, op: { ...resolvedOp, patch: updatedPatch } }
      } catch {
        // fall through — store body as-is if conversion fails
      }
    }
  }

  if (op.entityType === 'note' && resolvedOp.entity?.body !== undefined) {
    const markdownBody = resolvedOp.entity.body
    if (typeof markdownBody === 'string' && markdownBody.trim()) {
      try {
        const { doc } = markdownToDocForAgent(markdownBody)
        const plainText = docToPlainText(doc)
        const updatedEntity = { ...resolvedOp.entity, body: plainText, doc }
        return { valid: true, op: { ...resolvedOp, entity: updatedEntity } }
      } catch {
        // fall through
      }
    }
  }

  return { valid: true, op: resolvedOp }
}

export function validateOps(ops, { store, run, scope, context = {} } = {}) {
  const accepted = []
  const rejected = []
  let workingRun = run

  for (const op of ops) {
    const result = validateOp(op, { store, run: workingRun, scope, context })
    if (!result.valid) {
      rejected.push({ op, reason: result.reason })
      continue
    }
    accepted.push(result.op)
    workingRun = {
      ...workingRun,
      ops: [...(workingRun?.ops ?? []), result.op],
    }
  }

  return { valid: rejected.length === 0, accepted, rejected }
}
