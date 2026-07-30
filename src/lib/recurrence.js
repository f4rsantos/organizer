import { addDays, addMonths, addWeeks, format, isAfter, isBefore, parseISO } from 'date-fns'

export function isRecurring(task) {
  return Boolean(task?.recurrence?.freq)
}

function stepDate(date, freq, interval) {
  if (freq === 'daily') return addDays(date, interval)
  if (freq === 'weekly') return addWeeks(date, interval)
  if (freq === 'monthly') return addMonths(date, interval)
  return null
}

export function expandRecurringTask(task, rangeStart, rangeEnd) {
  if (!isRecurring(task) || !task.dueDate) return []
  const { freq, until } = task.recurrence
  const interval = Math.max(1, Number(task.recurrence.interval) || 1)
  const untilDate = until ? parseISO(until) : null
  const start = task.dueDate ? parseISO(task.dueDate) : null
  if (!start) return []

  const occurrences = []
  let cursor = start
  let guard = 0
  while (guard < 1000) {
    guard += 1
    if (untilDate && isAfter(cursor, untilDate)) break
    if (isAfter(cursor, rangeEnd)) break
    if (!isBefore(cursor, rangeStart)) {
      occurrences.push(buildOccurrence(task, cursor))
    }
    const next = stepDate(cursor, freq, interval)
    if (!next) break
    cursor = next
  }
  return occurrences
}

function buildOccurrence(task, date) {
  const dateISO = format(date, 'yyyy-MM-dd')
  const exception = task.recurrenceExceptions?.[dateISO] ?? {}
  return {
    ...task,
    id: `${task.id}::${dateISO}`,
    templateId: task.id,
    occurrenceDate: dateISO,
    dueDate: dateISO,
    done: exception.skipped ? task.done : (exception.done ?? false),
    isRecurringOccurrence: true,
    skipped: Boolean(exception.skipped),
  }
}

export function expandTasksForRange(tasks, rangeStart, rangeEnd) {
  const result = []
  for (const task of tasks) {
    if (isRecurring(task)) {
      result.push(...expandRecurringTask(task, rangeStart, rangeEnd))
    } else {
      result.push(task)
    }
  }
  return result
}

export function expandRecurringEvent(event, rangeStart, rangeEnd) {
  if (!isRecurring(event) || !event.date) return []
  const { freq, until } = event.recurrence
  const interval = Math.max(1, Number(event.recurrence.interval) || 1)
  const untilDate = until ? parseISO(until) : null
  const start = parseISO(event.date)

  const occurrences = []
  let cursor = start
  let guard = 0
  while (guard < 1000) {
    guard += 1
    if (untilDate && isAfter(cursor, untilDate)) break
    if (isAfter(cursor, rangeEnd)) break
    if (!isBefore(cursor, rangeStart)) {
      const dateISO = format(cursor, 'yyyy-MM-dd')
      occurrences.push({
        ...event,
        id: `${event.id}::${dateISO}`,
        templateId: event.id,
        date: dateISO,
        isRecurringOccurrence: true,
      })
    }
    const next = stepDate(cursor, freq, interval)
    if (!next) break
    cursor = next
  }
  return occurrences
}

export function expandEventsForRange(events, rangeStart, rangeEnd) {
  const result = []
  for (const event of events) {
    if (isRecurring(event) && event.date) {
      result.push(...expandRecurringEvent(event, rangeStart, rangeEnd))
    } else {
      result.push(event)
    }
  }
  return result
}
