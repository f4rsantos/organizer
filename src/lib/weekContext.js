import {
  differenceInCalendarWeeks, parseISO, format,
  getISOWeek, getISOWeeksInYear, setISOWeek, startOfISOWeek,
} from 'date-fns'
import { computeCurrentWeek, computeWeekCount, weekDateRange } from '@/lib/semesterUtils'

function semesterContext(semester) {
  const hasDates = Boolean(semester?.startDate && semester?.endDate)
  const weekCount = hasDates ? computeWeekCount(semester.startDate, semester.endDate) : 0
  return {
    mode: 'semesters',
    weekCount,
    currentWeek: hasDates ? computeCurrentWeek(semester.startDate, semester.endDate) : null,
    dateToWeek: dateStr => {
      if (!dateStr || !hasDates) return null
      return differenceInCalendarWeeks(parseISO(dateStr), parseISO(semester.startDate), { weekStartsOn: 1 }) + 1
    },
    weekDateRange: week => (hasDates ? weekDateRange(semester.startDate, week) : null),
  }
}

function isoWeekLabels(week, year) {
  const weekStart = startOfISOWeek(setISOWeek(new Date(year, 5, 1), week))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  return { start: format(weekStart, 'dd MMM'), end: format(weekEnd, 'dd MMM') }
}

function noneContext() {
  const today = new Date()
  const year = today.getFullYear()
  return {
    mode: 'none',
    weekCount: getISOWeeksInYear(today),
    currentWeek: getISOWeek(today),
    dateToWeek: dateStr => (dateStr ? getISOWeek(parseISO(dateStr)) : null),
    weekDateRange: week => isoWeekLabels(week, year),
  }
}

export function getWeekContext({ mode, semester }) {
  return mode === 'none' ? noneContext() : semesterContext(semester)
}

export function remapTaskWeeks(tasks, weekCtx) {
  return tasks.map(task => {
    if (task.dueDate) {
      const w = weekCtx.dateToWeek(task.dueDate)
      if (Number.isFinite(w)) return { ...task, weekStart: w, weekEnd: w }
    }
    const clamp = w => Math.max(1, Math.min(weekCtx.weekCount || 1, Number.isFinite(w) ? w : 1))
    const weekStart = clamp(task.weekStart)
    return { ...task, weekStart, weekEnd: Math.max(weekStart, clamp(task.weekEnd)) }
  })
}
