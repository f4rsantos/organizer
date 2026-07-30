import { isTaskInWeek } from './semesterUtils'

export const FREE_BOARD_ID = '__free__'

export function boardIdForTask(task) {
  return task?.semesterId ?? FREE_BOARD_ID
}

// Recurring tasks are represented on kanban by the template task itself (no per-occurrence
// cards): kanban is a workflow tool tracking one current unit of work, not a calendar of
// future dates, so a card here always reflects the template's own `done`/`kanban` state.
export function taskToCard(task) {
  return {
    ...task,
    columnId: task.kanban?.columnId ?? null,
    order: Number.isFinite(task.kanban?.order) ? task.kanban.order : 0,
    checklist: task.kanban?.checklist ?? [],
    checklistPreview: task.kanban?.checklistPreview === true,
  }
}

export function getTasksForWeek(tasks, week) {
  return tasks.filter(t => isTaskInWeek(t, week))
}

export function groupTasksByClass(tasks, classes) {
  const groups = {}
  for (const cls of classes) {
    groups[cls.id] = { cls, tasks: [] }
  }
  groups['other'] = { cls: { id: 'other', name: 'Other', color: '#94a3b8' }, tasks: [] }

  for (const task of tasks) {
    const key = task.classId && groups[task.classId] ? task.classId : 'other'
    groups[key].tasks.push(task)
  }

  return Object.values(groups)
}

export function completionRatio(tasks) {
  if (tasks.length === 0) return 1
  return tasks.filter(t => t.done).length / tasks.length
}

export function resolveKanbanPlacement(task, prevTask, state, firstColumnIdFor) {
  if (!task.views?.kanban || !task.weekStart || !task.weekEnd) return task.kanban ?? null
  const autoAdd = state.settings?.kanbanAutoAddToFirstColumn ?? false
  if (!task.kanban?.columnId) {
    return autoAdd ? { ...task.kanban, columnId: firstColumnIdFor(state, boardIdForTask(task)) } : (task.kanban ?? null)
  }
  const boardChanged = prevTask && boardIdForTask(prevTask) !== boardIdForTask(task)
  if (boardChanged && autoAdd) {
    return { ...task.kanban, columnId: firstColumnIdFor(state, boardIdForTask(task)) }
  }
  return task.kanban
}
