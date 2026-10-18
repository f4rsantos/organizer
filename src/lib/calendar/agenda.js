import { addDays, format, parseISO, startOfDay } from 'date-fns'
import { expandEventsForRange, expandTasksForRange } from '../recurrence.js'
import { dayTimeRange, eventDateRange, sortDayAgenda } from './dayAgenda.js'

function scopeId(state) {
  return state.settings?.semesterMode === 'none' ? null : state.activeSemesterId ?? null
}

function inScope(item, scope) {
  return item.semesterId == null || item.semesterId === scope
}

function taskRange(task) {
  const day = parseISO(task.dueDate)
  return { start: day, end: day }
}

function taskItem(task, classes) {
  return {
    kind: 'task',
    id: task.id,
    title: task.title,
    done: Boolean(task.done),
    className: classes.find(c => c.id === task.classId)?.name ?? null,
    range: task.startTime ? { start: task.startTime, end: task.endTime ?? null } : null,
  }
}

function eventItem(event, day) {
  return { kind: 'event', id: event.id, title: event.title, range: dayTimeRange(event, day), note: event.note || null }
}

function within(range, day) {
  return range && day >= startOfDay(range.start) && day <= startOfDay(range.end)
}

export function buildAgenda(state, { from, days }) {
  const scope = scopeId(state)
  const start = startOfDay(from)
  const end = addDays(start, days - 1)
  const classes = state.classes ?? []
  const events = expandEventsForRange((state.events ?? []).filter(e => inScope(e, scope)), start, end)
    .map(e => ({ ...e, _range: eventDateRange(e) }))
  const dated = (state.tasks ?? []).filter(t => inScope(t, scope) && t.dueDate && t.views?.list !== false)
  const tasks = expandTasksForRange(dated, start, end)

  const agendaDays = Array.from({ length: days }, (_, i) => {
    const day = addDays(start, i)
    const dayEvents = sortDayAgenda(events.filter(e => within(e._range, day)), day).map(e => eventItem(e, day))
    const dayTasks = tasks.filter(t => within(taskRange(t), day)).map(t => taskItem(t, classes))
    return { date: format(day, 'yyyy-MM-dd'), items: [...dayEvents, ...dayTasks] }
  })

  const overdue = dated
    .filter(t => !t.done && !t.recurrence && parseISO(t.dueDate) < start)
    .map(t => taskItem(t, classes))

  return { days: agendaDays, overdue }
}
