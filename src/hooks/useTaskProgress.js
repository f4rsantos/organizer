import { useStore } from '@/store/useStore'
import { getTasksForWeek, groupTasksByClass, completionRatio } from '@/lib/taskUtils'

export function useTaskProgress(semesterId, classes, week, tasksOverride = null) {
  const allTasks = useStore(s => s.tasks)
  const source = Array.isArray(tasksOverride) ? tasksOverride : allTasks
  const semTasks = source.filter(t => t.semesterId === semesterId)
  const weekTasks = week ? getTasksForWeek(semTasks, week) : semTasks

  const overall = completionRatio(weekTasks)
  const groups = groupTasksByClass(weekTasks, classes)
  const byClass = Object.fromEntries(
    groups.map(({ cls, tasks }) => [cls.id, completionRatio(tasks)])
  )

  return { overall, byClass, weekTasks, groups }
}
