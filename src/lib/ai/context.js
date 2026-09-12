import { format, isValid } from 'date-fns'

export const DUE_SOON_DAYS = 7
const NOTE_SIZE_UNIT = 1000

function formatDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (!isValid(date)) return null
  return format(date, 'yyyy-MM-dd')
}

function daysUntil(value, now) {
  const date = value instanceof Date ? value : new Date(value)
  if (!isValid(date)) return null
  return Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

function noteSizeLabel(body) {
  const length = typeof body === 'string' ? body.length : 0
  if (length < NOTE_SIZE_UNIT) return `${length}b`
  return `${(length / NOTE_SIZE_UNIT).toFixed(1)}k`
}

function classNameById(classes) {
  const map = new Map()
  for (const cls of classes ?? []) {
    if (cls?.id) map.set(cls.id, cls.name ?? cls.id)
  }
  return map
}

function folderNameById(folders) {
  const map = new Map()
  for (const folder of folders ?? []) {
    if (folder?.id) map.set(folder.id, folder.name ?? folder.id)
  }
  return map
}

function isInFolderScope(entityFolderId, scope) {
  if (!scope || scope.type !== 'folder') return true
  return entityFolderId === scope.folderId
}

function isInIdScope(entityId, scope) {
  if (!scope || !Array.isArray(scope.ids) || !scope.ids.length) return true
  return scope.ids.includes(entityId)
}

function isInClassScope(classId, scope) {
  if (!scope || scope.type !== 'class') return true
  return classId === scope.classId
}

function isInSemesterScope(semesterId, scope) {
  if (!scope || scope.type !== 'semester') return true
  return semesterId === scope.semesterId
}

function scopeFilterTask(task, scope) {
  if (!isInIdScope(task.id, scope)) return false
  if (!isInClassScope(task.classId, scope)) return false
  if (!isInSemesterScope(task.semesterId, scope)) return false
  return true
}

function scopeFilterEvent(event, scope) {
  if (!isInIdScope(event.id, scope)) return false
  if (!isInSemesterScope(event.semesterId, scope)) return false
  return true
}

function scopeFilterNote(note, scope) {
  if (!isInIdScope(note.id, scope)) return false
  if (!isInFolderScope(note.folderId, scope)) return false
  return true
}

function scopeFilterHabit(habit, scope) {
  return isInIdScope(habit.id, scope)
}

function scopeFilterClass(cls, scope) {
  if (!isInIdScope(cls.id, scope)) return false
  if (!isInSemesterScope(cls.semesterId, scope)) return false
  return true
}

function scopeFilterFolder(folder, scope) {
  if (!isInIdScope(folder.id, scope)) return false
  if (scope?.type === 'folder') return folder.id === scope.folderId || folder.parentId === scope.folderId
  return true
}

export function scopedEntities(store, scope) {
  const tasks = (store?.tasks ?? []).filter(t => scopeFilterTask(t, scope))
  const events = (store?.events ?? []).filter(e => scopeFilterEvent(e, scope))
  const notes = (store?.notes ?? []).filter(n => scopeFilterNote(n, scope))
  const habits = (store?.habits ?? []).filter(h => scopeFilterHabit(h, scope))
  const classes = (store?.classes ?? []).filter(c => scopeFilterClass(c, scope))
  const noteFolders = (store?.noteFolders ?? []).filter(f => scopeFilterFolder(f, scope))
  const kanbanCards = tasks.filter(t => t.views?.kanban)
  return { tasks, events, notes, habits, classes, noteFolders, kanbanCards }
}

function weekEventCount(events, now) {
  return events.filter(e => {
    const days = daysUntil(e.date ?? e.startDate, now)
    return days !== null && days >= 0 && days <= DUE_SOON_DAYS
  }).length
}

function dueSoonTaskCount(tasks, now) {
  return tasks.filter(t => {
    if (t.done) return false
    const days = daysUntil(t.dueDate, now)
    return days !== null && days >= 0 && days <= DUE_SOON_DAYS
  }).length
}

function buildSummaryLine(entities, now) {
  const { classes, tasks, notes, habits, kanbanCards, events } = entities
  const dueSoon = dueSoonTaskCount(tasks, now)
  const weekEvents = weekEventCount(events, now)
  return [
    `${classes.length} classes`,
    `${tasks.length} tasks (${dueSoon} due ≤${DUE_SOON_DAYS}d)`,
    `${notes.length} notes`,
    `${habits.length} habits`,
    `${kanbanCards.length} kanban`,
    `${weekEvents} events this week`,
  ].join(' · ')
}

function buildTaskLines(tasks, classNames) {
  if (!tasks.length) return []
  const lines = tasks.map(t => {
    const parts = [t.id, t.title ?? '']
    if (t.dueDate) parts.push(`due ${formatDate(t.dueDate)}`)
    if (t.classId) parts.push(`class:${classNames.get(t.classId) ?? t.classId}`)
    if (t.views?.kanban) parts.push(`col:${t.kanban?.columnId ?? ''}`)
    if (t.done) parts.push('done')
    return parts.join('  ')
  })
  return ['TASKS', ...lines]
}

function buildEventLines(events) {
  if (!events.length) return []
  const lines = events.map(e => {
    const parts = [e.id, e.title ?? '']
    const date = e.date ?? e.startDate
    if (date) parts.push(formatDate(date))
    return parts.join('  ')
  })
  return ['EVENTS', ...lines]
}

function buildNoteLines(notes, folderNames, mode) {
  if (!notes.length) return []
  const lines = notes.map(n => {
    const parts = [n.id, `"${n.title ?? ''}"`]
    if (n.folderId) parts.push(`folder:${folderNames.get(n.folderId) ?? n.folderId}`)
    if (mode === 'requests') parts.push(noteSizeLabel(n.body))
    return parts.join('  ')
  })
  return ['NOTES', ...lines]
}

function buildHabitLines(habits) {
  if (!habits.length) return []
  const lines = habits.map(h => [h.id, h.title ?? ''].join('  '))
  return ['HABITS', ...lines]
}

function buildClassLines(classes) {
  if (!classes.length) return []
  const lines = classes.map(c => [c.id, c.name ?? ''].join('  '))
  return ['CLASSES', ...lines]
}

function buildFolderLines(folders) {
  if (!folders.length) return []
  const lines = folders.map(f => [f.id, f.name ?? ''].join('  '))
  return ['FOLDERS', ...lines]
}

function buildKanbanLines(cards, classNames) {
  if (!cards.length) return []
  const lines = cards.map(c => {
    const parts = [c.id, c.title ?? '', `col:${c.kanban?.columnId ?? ''}`]
    if (c.classId) parts.push(`class:${classNames.get(c.classId) ?? c.classId}`)
    return parts.join('  ')
  })
  return ['KANBAN', ...lines]
}

export function buildContextBlock({ store, scope, optimizeFor, now = new Date() } = {}) {
  const entities = scopedEntities(store, scope)
  const classNames = classNameById(entities.classes)
  const folderNames = folderNameById(entities.noteFolders)
  const mode = optimizeFor === 'tokens' ? 'tokens' : 'requests'

  const lines = [buildSummaryLine(entities, now)]

  if (mode === 'tokens') {
    return lines.filter(Boolean).join('\n')
  }

  lines.push(...buildTaskLines(entities.tasks, classNames))
  lines.push(...buildEventLines(entities.events))
  lines.push(...buildNoteLines(entities.notes, folderNames, mode))
  lines.push(...buildHabitLines(entities.habits))
  lines.push(...buildClassLines(entities.classes))
  lines.push(...buildFolderLines(entities.noteFolders))
  lines.push(...buildKanbanLines(entities.kanbanCards, classNames))

  return lines.filter(Boolean).join('\n')
}

const SYSTEM_PROMPT_BASE = [
  'You are an agent operating inside a personal organizer app.',
  'You edit tasks, events, notes, folders, habits, classes and kanban cards through the create/update/delete tools.',
  'Plan the whole change before acting. Emit every operation you are confident about in a single turn — do not emit one operation and wait for the next turn.',
  'Batch aggressively: fewer round-trips is both faster and more accurate.',
  'Only use ids that appear in the context or were returned by a tool call in this run.',
  'When you are finished, call done with a short summary. If you cannot proceed, call done and explain why.',
]

const REQUESTS_MODE_PROMPT_LINE = 'The context block below already contains the full working set for this run — ids, titles and dates. Do not call query.'

const TOKENS_MODE_PROMPT_LINE = 'The context block below is a scoped index only. Use query to list matching items and fetch to read note bodies or full details before writing.'

export function buildSystemPrompt({ optimizeFor } = {}) {
  const mode = optimizeFor === 'tokens' ? 'tokens' : 'requests'
  const modeLine = mode === 'tokens' ? TOKENS_MODE_PROMPT_LINE : REQUESTS_MODE_PROMPT_LINE
  return [...SYSTEM_PROMPT_BASE, modeLine].join('\n')
}
