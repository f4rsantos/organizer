import {
  differenceInCalendarWeeks, parseISO, format, addWeeks,
  getISOWeek, getISOWeeksInYear, setISOWeek, startOfISOWeek,
} from 'date-fns'
import { computeCurrentWeek, computeWeekCount, weekDateRange } from '@/lib/semesterUtils'

function semesterWeekBounds(semester, week) {
  const start = addWeeks(startOfISOWeek(parseISO(semester.startDate)), week - 1)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return { start, end }
}

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
    weekDateBounds: week => (hasDates ? semesterWeekBounds(semester, week) : null),
  }
}

function isoWeekBounds(week, year) {
  const weekStart = startOfISOWeek(setISOWeek(new Date(year, 5, 1), week))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  return { start: weekStart, end: weekEnd }
}

function isoWeekLabels(week, year) {
  const { start, end } = isoWeekBounds(week, year)
  return { start: format(start, 'dd MMM'), end: format(end, 'dd MMM') }
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
    weekDateBounds: week => isoWeekBounds(week, year),
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
