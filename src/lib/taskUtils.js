import { isTaskInWeek } from './semesterUtils'

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
  if (tasks.length === 0) return 0
  return tasks.filter(t => t.done).length / tasks.length
}
