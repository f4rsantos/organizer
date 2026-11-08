import { useStore } from '@/store/useStore'
import { tasksForWeekWithCarryOver, groupTasksByClass, completionRatio } from '@/lib/taskUtils'
import { expandTasksForRange, isRecurring } from '@/lib/recurrence'

export function useTaskProgress(semesterId, classes, week, tasksOverride = null, weekBounds = null, currentWeek = null) {
  const allTasks = useStore(s => s.tasks)
  const carryOver = useStore(s => s.settings?.carryOverTasks ?? false)
  const source = Array.isArray(tasksOverride) ? tasksOverride : allTasks
  const semTasks = source.filter(t => t.semesterId === semesterId)
  const weekTasks = week
    ? [
        ...semTasks.filter(isRecurring),
        ...tasksForWeekWithCarryOver(semTasks.filter(t => !isRecurring(t)), week, { carryOver, currentWeek }),
      ]
    : semTasks
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
