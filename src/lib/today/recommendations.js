import { differenceInCalendarDays, parseISO } from 'date-fns'
import { boardIdForTask } from '../taskUtils.js'
import { isExamTitle } from '../classes/classEvents.js'

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }
const UNRANKED = 3

function isOpen(task) {
  return task && !task.done && !task.recurrence && !isExamTitle(task.title)
}

function daysUntilDue(task, today) {
  if (!task.dueDate) return null
  return differenceInCalendarDays(parseISO(task.dueDate), parseISO(today))
}

function urgency(task, today) {
  return daysUntilDue(task, today) ?? Number.POSITIVE_INFINITY
}

function checklistProgress(task) {
  const items = Array.isArray(task.checklist) ? task.checklist : []
  if (!items.length) return null
  return { done: items.filter(item => item.done).length, total: items.length }
}

function reasons(task, today) {
  return {
    id: task.id,
    title: task.title,
    daysLeft: daysUntilDue(task, today),
    highPriority: task.priority === 'high',
    checklist: checklistProgress(task),
  }
}

function isListTask(task) {
  return task.views?.list !== false
}

function focusTask(tasks, today) {
  const task = tasks
    .filter(task => isOpen(task) && isListTask(task))
    .filter(task => task.dueDate || task.priority === 'high')
    .sort((a, b) => urgency(a, today) - urgency(b, today)
      || (PRIORITY_RANK[a.priority] ?? UNRANKED) - (PRIORITY_RANK[b.priority] ?? UNRANKED))[0]
  return task ? { kind: 'task', ...reasons(task, today) } : null
}

function inProgressColumns(kanban, boardId) {
  const columns = [...(kanban?.[boardId]?.columns ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return columns.slice(1, -1)
}

function kanbanCard(tasks, kanban, skipId, today) {
  const card = tasks
    .filter(task => isOpen(task) && task.kanban?.columnId && task.id !== skipId)
    .map(task => ({ task, column: inProgressColumns(kanban, boardIdForTask(task)).find(c => c.id === task.kanban.columnId) }))
    .filter(entry => entry.column)
    .sort((a, b) => urgency(a.task, today) - urgency(b.task, today) || (a.task.kanban.order ?? 0) - (b.task.kanban.order ?? 0))[0]
  return card ? { kind: 'kanban', column: card.column.title, ...reasons(card.task, today) } : null
}

export function buildRecommendations({ today, prefs, items, tasks, kanban, excludeIds = new Set() }) {
  const openTasks = (tasks ?? []).filter(task => !excludeIds.has(task.id))
  const task = prefs.tasks ? focusTask(openTasks, today) : null
  const card = prefs.kanban ? kanbanCard(openTasks, kanban, task?.id, today) : null
  const study = prefs.study ? items.find(item => item.kind === 'study') : null
  const rest = prefs.rest ? items.find(item => item.kind === 'rest') : null
  return [study, task, card, rest].filter(Boolean)
}

