import { isWithinInterval, parseISO } from 'date-fns'

export function itemsForDay(day, tasks, holidays, events) {
  const dayHolidays = holidays.filter(h => isWithinInterval(day, { start: parseISO(h.startDate), end: parseISO(h.endDate) }))
  const dayEvents = events.filter(e => e._range && isWithinInterval(day, e._range))
  const dayTasks = tasks.filter(tk => isWithinInterval(day, tk._range))
  return { dayHolidays, dayEvents, dayTasks }
}

// Stable identity for the note attached to a calendar entry. Recurring events
// expand into per-date occurrences that share a templateId, so the date is part
// of the key: "class every Monday" gets one note per Monday, not one overall.
export function noteKeyForEvent(event, day) {
  if (!event) return null
  const base = event.isRecurringOccurrence ? (event.templateId ?? event.id) : event.id
  if (!base) return null
  const date = event.date
    ?? event.startDate
    ?? (day instanceof Date && !Number.isNaN(day) ? day.toISOString().slice(0, 10) : null)
  return date ? `event:${base}:${date}` : `event:${base}`
}
