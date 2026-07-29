import { useStore } from '@/store/useStore'
import { getTasksForWeek, groupTasksByClass, completionRatio } from '@/lib/taskUtils'
import { expandTasksForRange, isRecurring } from '@/lib/recurrence'

export function useTaskProgress(semesterId, classes, week, tasksOverride = null, weekBounds = null) {
  const allTasks = useStore(s => s.tasks)
  const source = Array.isArray(tasksOverride) ? tasksOverride : allTasks
  const semTasks = source.filter(t => t.semesterId === semesterId)
  const weekTasks = week ? getTasksForWeek(semTasks, week) : semTasks
  const expandedWeekTasks = weekBounds
    ? weekTasks.flatMap(t => (isRecurring(t)
        ? expandTasksForRange([t], weekBounds.start, weekBounds.end)
        : [t]))
    : weekTasks

  const overall = completionRatio(expandedWeekTasks)
  const groups = groupTasksByClass(expandedWeekTasks, classes)
  const byClass = Object.fromEntries(
    groups.map(({ cls, tasks }) => [cls.id, completionRatio(tasks)])
  )

  return { overall, byClass, weekTasks: expandedWeekTasks, groups }
}
