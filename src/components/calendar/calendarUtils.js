import { isWithinInterval, parseISO } from 'date-fns'

export function itemsForDay(day, tasks, holidays, events) {
  const dayHolidays = holidays.filter(h => isWithinInterval(day, { start: parseISO(h.startDate), end: parseISO(h.endDate) }))
  const dayEvents = events.filter(e => e._range && isWithinInterval(day, e._range))
  const dayTasks = tasks.filter(tk => isWithinInterval(day, tk._range))
  return { dayHolidays, dayEvents, dayTasks }
}
