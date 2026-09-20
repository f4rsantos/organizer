const DONE_COLUMN_KEYWORDS = ['done', 'complete', 'finished', 'shipped', 'closed']

function normalizeColumnTitle(title) {
  return (title ?? '').toString().trim().toLowerCase()
}

function isDoneLikeColumn(column, columns) {
  if (!column) return false
  const title = normalizeColumnTitle(column.title)
  if (DONE_COLUMN_KEYWORDS.some(word => title.includes(word))) return true
  if (!Array.isArray(columns) || !columns.length) return false
  const sorted = [...columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return sorted[sorted.length - 1]?.id === column.id
}

export function taskAddedNoDueDate(task) {
  if (!task) return null
  if (task.dueDate) return null
  if (task.done) return null
  return { kind: 'task-no-due-date', entityId: task.id, title: task.title ?? '' }
}

export function taskUpdatedLostDueDate(prevTask, nextTask) {
  if (!prevTask || !nextTask) return null
  if (!prevTask.dueDate) return null
  if (nextTask.dueDate) return null
  if (nextTask.done) return null
  return { kind: 'task-due-date-removed', entityId: nextTask.id, title: nextTask.title ?? '' }
}

export function kanbanCardMovedToDoneColumn({ task, targetColumnId, columns }) {
  if (!task) return null
  const column = (columns ?? []).find(c => c.id === targetColumnId)
  if (!isDoneLikeColumn(column, columns)) return null
  const hasOpenChecklistItems = (task.kanban?.checklist ?? []).some(item => !item.done)
  if (!hasOpenChecklistItems) return null
  return { kind: 'kanban-card-done-with-open-checklist', entityId: task.id, title: task.title ?? '' }
}

export function eventAddedNoReminder(event) {
  if (!event) return null
  if (event.reminderOffsetHours != null) return null
  if (!event.date && !event.startDate) return null
  return { kind: 'event-no-reminder', entityId: event.id, title: event.title ?? '' }
}

export function gradeComponentMissingWeight(component) {
  if (!component) return null
  if (component.weight != null && Number(component.weight) > 0) return null
  return { kind: 'grade-component-no-weight', entityId: component.id ?? null, title: component.name ?? '' }
}

export function appOpenedOverdueTasks(tasks, now = new Date()) {
  const overdue = (tasks ?? []).filter(t => {
    if (t.done || !t.dueDate) return false
    const due = new Date(t.dueDate)
    return !Number.isNaN(due.getTime()) && due.getTime() < now.getTime()
  })
  if (!overdue.length) return null
  return { kind: 'app-open-overdue-tasks', entityId: null, title: '', count: overdue.length }
}

function lastAddedTask(prevState, nextState) {
  const prevIds = new Set((prevState?.tasks ?? []).map(t => t.id))
  const added = (nextState?.tasks ?? []).filter(t => !prevIds.has(t.id))
  return added[added.length - 1] ?? null
}

const HEURISTICS_BY_TRIGGER = {
  addTask: ({ args }) => taskAddedNoDueDate(args?.[0]),
  updateTask: ({ args, prevState, nextState }) => {
    const [id] = args
    const prevTask = (prevState?.tasks ?? []).find(t => t.id === id)
    const nextTask = (nextState?.tasks ?? []).find(t => t.id === id)
    return taskUpdatedLostDueDate(prevTask, nextTask)
  },
  addKanbanCard: ({ prevState, nextState }) => taskAddedNoDueDate(lastAddedTask(prevState, nextState)),
  moveKanbanCard: ({ args, prevState, nextState }) => {
    const [semId, cardId, targetColId] = args
    const task = (nextState?.tasks ?? []).find(t => t.id === cardId)
    const boardId = semId ?? '__free__'
    const columns = nextState?.kanban?.[boardId]?.columns ?? prevState?.kanban?.[boardId]?.columns ?? []
    return kanbanCardMovedToDoneColumn({ task, targetColumnId: targetColId, columns })
  },
  addEvent: ({ nextState }) => {
    const events = nextState?.events ?? []
    const latest = events[events.length - 1]
    return eventAddedNoReminder(latest)
  },
  setGradeComponents: ({ args }) => {
    const [, , components] = args
    const latest = (components ?? [])[components?.length - 1]
    return gradeComponentMissingWeight(latest)
  },
}

export const PROACTIVE_TRIGGER_ACTIONS = Object.keys(HEURISTICS_BY_TRIGGER)

export function evaluateProactiveHeuristic(triggerName, context) {
  const heuristic = HEURISTICS_BY_TRIGGER[triggerName]
  if (!heuristic) return null
  return heuristic(context) ?? null
}
