import { useMemo } from 'react'
import { differenceInCalendarWeeks, isWithinInterval, parseISO } from 'date-fns'
import { useStore } from '@/store/useStore'
import { isSharedLocalHidden } from '@/lib/collab/mergeUtils'

function toLocalWeek(date, semesterStart) {
  return differenceInCalendarWeeks(date, semesterStart, { weekStartsOn: 1 }) + 1
}

function mapRemoteTask(task, teamId, userId, semesterId, semester) {
  const hasSemesterDates = Boolean(semester?.startDate && semester?.endDate)
  let resolvedWeekStart = Number.isFinite(task?.weekStart) ? task.weekStart : null
  let resolvedWeekEnd = Number.isFinite(task?.weekEnd) ? task.weekEnd : null

  const semStart = hasSemesterDates ? parseISO(semester.startDate) : null
  const semEnd = hasSemesterDates ? parseISO(semester.endDate) : null
  const hasValidSemesterRange = Boolean(
    semStart && semEnd && !Number.isNaN(semStart.getTime()) && !Number.isNaN(semEnd.getTime()),
  )

  if (task?.dueDate && hasSemesterDates) {
    const due = parseISO(task.dueDate)
    const hasValidDates = !Number.isNaN(due.getTime()) && hasValidSemesterRange

    if (hasValidDates && isWithinInterval(due, { start: semStart, end: semEnd })) {
      const localWeek = toLocalWeek(due, semStart)
      resolvedWeekStart = localWeek
      resolvedWeekEnd = localWeek
    }
  } else if (hasValidSemesterRange && task?.sharedWeekStartDate && task?.sharedWeekEndDate) {
    const sharedStart = parseISO(task.sharedWeekStartDate)
    const sharedEnd = parseISO(task.sharedWeekEndDate)
    const hasValidSharedRange = !Number.isNaN(sharedStart.getTime()) && !Number.isNaN(sharedEnd.getTime())

    if (hasValidSharedRange) {
      const localStart = Math.max(1, toLocalWeek(sharedStart, semStart))
      const localEnd = Math.max(localStart, toLocalWeek(sharedEnd, semStart))
      resolvedWeekStart = localStart
      resolvedWeekEnd = localEnd
    }
  }

  const weekStart = Number.isFinite(resolvedWeekStart) ? resolvedWeekStart : 1
  const weekEnd = Number.isFinite(resolvedWeekEnd) ? Math.max(weekStart, resolvedWeekEnd) : weekStart
  const done = !!task?.doneForAll || !!task?.doneBy?.[userId]

  return {
    ...task,
    semesterId,
    weekStart,
    weekEnd,
    id: `shared:${teamId}:${task.id}`,
    done,
    sharedMeta: {
      teamId,
      sharedTaskId: task.id,
      remote: true,
    },
  }
}

export function useMergedTasks(semesterId) {
  const localTasks = useStore(s => s.tasks ?? [])
  const semesters = useStore(s => s.semesters ?? [])
  const collabEnabled = useStore(s => s.settings?.collabEnabled === true)
  const userId = useStore(s => s.collab?.userId)
  const memberships = useStore(s => s.collab?.memberships ?? [])
  const runtimeTeams = useStore(s => s.collabRuntime?.teams ?? {})
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const semester = useMemo(
    () => semesters.find(candidate => candidate.id === semesterId) ?? null,
    [semesters, semesterId],
  )

  return useMemo(() => {
    const activeTeamIds = new Set((collabEnabled ? memberships : []).map(m => m.teamId))
    const local = localTasks.filter(task => {
      if (task.semesterId !== semesterId) return false
      if (task.views?.list === false) return false
      return !isSharedLocalHidden(task, activeTeamIds, runtimeTeams)
    })

    const showRemote = collabEnabled && semesterId === activeSemesterId
    const remote = (showRemote ? memberships : []).flatMap(membership => {
      const team = runtimeTeams[membership.teamId]
      const tasks = team?.state?.tasks ?? []
      return tasks
        .map(task => mapRemoteTask(task, membership.teamId, userId, semesterId, semester))
        .filter(Boolean)
    })

    return [...local, ...remote]
  }, [localTasks, collabEnabled, memberships, runtimeTeams, semesterId, activeSemesterId, semester, userId])
}
