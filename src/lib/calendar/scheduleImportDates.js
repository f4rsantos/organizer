import { addDays, format, isAfter, parseISO, startOfWeek } from 'date-fns'

const WEEK_OPTIONS = { weekStartsOn: 1 }
const DAYS_PER_WEEK = 7

function isoDate(date) {
  return format(date, 'yyyy-MM-dd')
}

function weekly(until) {
  return { freq: 'weekly', interval: 1, until: until ?? null }
}

function mondayIndex(date) {
  return (date.getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK
}

function rangeOccurrence(dayIndex, rangeStart, rangeEnd) {
  if (!rangeStart || !rangeEnd) return null
  const start = parseISO(rangeStart)
  const end = parseISO(rangeEnd)
  const offset = (dayIndex - mondayIndex(start) + DAYS_PER_WEEK) % DAYS_PER_WEEK
  const first = addDays(start, offset)
  if (isAfter(first, end)) return null
  return { date: isoDate(first), recurrence: weekly(rangeEnd) }
}

export function scheduleImportOccurrence(dayIndex, { mode, semesterStart, semesterEnd, rangeStart, rangeEnd, today = new Date() }) {
  if (mode === 'range') return rangeOccurrence(dayIndex, rangeStart, rangeEnd)
  const anchor = semesterStart ? parseISO(semesterStart) : today
  const date = isoDate(addDays(startOfWeek(anchor, WEEK_OPTIONS), dayIndex))
  return { date, recurrence: mode === 'every' ? weekly(semesterEnd) : null }
}
