import { isTaskInWeek } from './semesterUtils'

export const FREE_BOARD_ID = '__free__'
export const EISENHOWER_DISMISSED = 'dismissed'

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

// `userId` may be a plain id or a resolver taking the task's team id. A list can
// mix tasks from several teams, and each team keys doneBy by its own per-project
// auth UID, so those callers pass a resolver.
export function isTaskDone(task, userId) {
  if (!task?.sharedMeta?.remote) return !!task?.done
  const id = typeof userId === 'function' ? userId(task.sharedMeta.teamId) : userId
  return !!task.doneForAll || !!task?.doneBy?.[id]
}

export function splitCompletedTasks(tasks, userId) {
  const pending = []
  const completed = []
  for (const task of tasks ?? []) {
    if (isTaskDone(task, userId)) completed.push(task)
    else pending.push(task)
  }
  return { pending, completed }
}

export function completionRatio(tasks) {
  if (tasks.length === 0) return 1
  return tasks.filter(t => t.done).length / tasks.length
}

export function resolveKanbanPlacement(task, prevTask, state, firstColumnIdFor, currentWeek = null) {
  const autoAdd = state.settings?.kanbanAutoAddToFirstColumn ?? false
  const views = task.views ?? {}

  if (!views.kanban) {
    const inCurrentWeek = Number.isFinite(currentWeek)
      && Number.isFinite(task.weekStart) && Number.isFinite(task.weekEnd)
      && isTaskInWeek(task, currentWeek)
    if (autoAdd && inCurrentWeek && !task.done) {
      return {
        views: { ...views, kanban: true },
        kanban: { columnId: firstColumnIdFor(state, boardIdForTask(task)), order: 0, checklist: [] },
      }
    }
    return { views, kanban: task.kanban ?? null }
  }

  if (!task.weekStart || !task.weekEnd) return { views, kanban: task.kanban ?? null }

  if (!task.kanban?.columnId) {
    return {
      views,
      kanban: autoAdd
        ? { ...task.kanban, columnId: firstColumnIdFor(state, boardIdForTask(task)) }
        : (task.kanban ?? null),
    }
  }

  const boardChanged = prevTask && boardIdForTask(prevTask) !== boardIdForTask(task)
  if (boardChanged && autoAdd) {
    return { views, kanban: { ...task.kanban, columnId: firstColumnIdFor(state, boardIdForTask(task)) } }
  }
  return { views, kanban: task.kanban }
}
