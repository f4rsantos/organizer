import { differenceInCalendarWeeks, parseISO, startOfWeek, addWeeks, format, isWithinInterval, areIntervalsOverlapping } from 'date-fns'

export function computeWeekCount(startDate, endDate) {
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  return Math.max(1, differenceInCalendarWeeks(end, start, { weekStartsOn: 1 }) + 1)
}

export function computeCurrentWeek(startDate, endDate) {
  const today = new Date()
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  if (!isWithinInterval(today, { start, end })) return null
  return differenceInCalendarWeeks(today, start, { weekStartsOn: 1 }) + 1
}

export function weekDateRange(startDate, weekNumber) {
  const start = parseISO(startDate)
  const weekStart = addWeeks(startOfWeek(start, { weekStartsOn: 1 }), weekNumber - 1)
  const weekEnd = addWeeks(weekStart, 1)
  weekEnd.setDate(weekEnd.getDate() - 1)
  return {
    start: format(weekStart, 'dd MMM'),
    end: format(weekEnd, 'dd MMM'),
  }
}

export function isTaskInWeek(task, week) {
  return task.weekStart <= week && task.weekEnd >= week
}

export function generateWeekOptions(count) {
  return Array.from({ length: count }, (_, i) => ({ value: i + 1, label: `Week ${i + 1}` }))
}

export function getHolidaysForWeek(semesterStartDate, weekNumber, holidays) {
  const start = parseISO(semesterStartDate)
  const weekStart = addWeeks(startOfWeek(start, { weekStartsOn: 1 }), weekNumber - 1)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  return holidays.filter(h => {
    const hStart = parseISO(h.startDate)
    const hEnd = parseISO(h.endDate)
    return areIntervalsOverlapping({ start: weekStart, end: weekEnd }, { start: hStart, end: hEnd }, { inclusive: true })
  })
}
