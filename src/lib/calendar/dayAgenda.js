import { parseISO } from 'date-fns'
import { minutesToTime, segmentForDay } from './eventLayout.js'

export function eventDateRange(event) {
  if (event.date) return { start: parseISO(event.date), end: parseISO(event.date) }
  if (event.startDate) return { start: parseISO(event.startDate), end: parseISO(event.endDate ?? event.startDate) }
  return null
}

export function dayTimeRange(event, day) {
  const segment = segmentForDay(event, day)
  if (!segment) return null
  const { continuesBefore, continuesAfter } = segment
  if (continuesBefore && continuesAfter) return null
  const start = continuesBefore ? null : minutesToTime(segment.startMinutes)
  const end = continuesAfter || !event.endTime ? null : minutesToTime(segment.endMinutes)
  if (!start && !end) return null
  if (continuesAfter) return { start, end, continues: 'after' }
  if (continuesBefore) return { start, end, continues: 'before' }
  return { start, end }
}

function sortKey(event, day) {
  const range = dayTimeRange(event, day)
  if (!range) return -1
  return segmentForDay(event, day).startMinutes
}

export function sortDayAgenda(events, day) {
  return events
    .map((event, order) => ({ event, order, key: sortKey(event, day) }))
    .sort((a, b) => a.key - b.key || a.order - b.order)
    .map(item => item.event)
}
