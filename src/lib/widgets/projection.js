import { toDateKey } from '@/lib/taskReminders'
import { FREE_BOARD_ID } from '@/lib/taskUtils'
import { sortByOrder } from '@/lib/utils'
import { getWeekContext } from '@/lib/weekContext'
import { currentPeriodKey, isCheckedIn, isRestDay, habitStreak } from '@/lib/habits'
import { mergedKanban, mergedTasks } from './merge'
import {
  getPeriodStart, getPomodoroTimestamp, getPomodoroCompletedCount,
  getPomodoroAbandonedCount, getPomodoroFocusSecs,
} from '@/components/focus/pomodoro/utils'

export const PROJECTION_VERSION = 1
const MAX_TASKS = 25
const MAX_EVENTS = 15
const MAX_COLUMNS = 8
const MAX_CARDS = 6
const MAX_AGENDA = 12
const MAX_HABITS = 10
const AGENDA_DAYS = 14
const MAX_TOMATOES = 12
const MAX_DAY_ENTRIES = 4

function classNameById(classes) {
  const map = {}
  for (const cls of classes ?? []) map[cls.id] = cls.name
  return map
}

function classColorById(classes) {
  const map = {}
  for (const cls of classes ?? []) map[cls.id] = cls.color
  return map
}

function eventDateKeys(event) {
  if (typeof event.date === 'string') return [event.date.slice(0, 10)]
  if (typeof event.startDate !== 'string') return []
  const start = event.startDate.slice(0, 10)
  const end = (event.endDate ?? event.startDate).slice(0, 10)
  return start === end ? [start] : [start, end]
}

function occursOn(event, dayKey) {
  const keys = eventDateKeys(event)
  if (keys.length === 0) return false
  if (keys.length === 1) return keys[0] === dayKey
  return dayKey >= keys[0] && dayKey <= keys[1]
}

function timeOf(event) {
  return typeof event.startTime === 'string' ? event.startTime : ''
}

export function weekContextFor(state) {
  const mode = state.settings?.semesterMode ?? 'semesters'
  const semester = mode === 'none'
    ? null
    : ((state.semesters ?? []).find(s => s.id === state.activeSemesterId) ?? null)
  return getWeekContext({ mode, semester })
}

function inCurrentWeek(task, ctx) {
  const week = ctx.currentWeek
  if (!Number.isFinite(week)) return true
  if (typeof task.dueDate === 'string') {
    const due = ctx.dateToWeek(task.dueDate.slice(0, 10))
    if (Number.isFinite(due)) return due === week
  }
  const start = Number.isFinite(task.weekStart) ? task.weekStart : null
  if (start === null) return true
  const end = Number.isFinite(task.weekEnd) ? task.weekEnd : start
  return week >= start && week <= end
}

export function buildTasksProjection(state, dayKey, ctx = weekContextFor(state)) {
  const names = classNameById(state.classes)
  const colors = classColorById(state.classes)
  const overdueOf = t => typeof t.dueDate === 'string' && t.dueDate.slice(0, 10) < dayKey

  const classOrder = {}
  ;(state.classes ?? []).forEach((cls, i) => { classOrder[cls.id] = i })
  const rankOf = t => (t.classId && classOrder[t.classId] !== undefined
    ? classOrder[t.classId]
    : Number.MAX_SAFE_INTEGER)

  return mergedTasks(state)
    .filter(t => !t.done)
    .filter(t => t.views?.list !== false)
    .filter(t => overdueOf(t) || inCurrentWeek(t, ctx))
    .sort((a, b) => {
      if (rankOf(a) !== rankOf(b)) return rankOf(a) - rankOf(b)
      if (overdueOf(a) !== overdueOf(b)) return overdueOf(a) ? -1 : 1
      const ad = typeof a.dueDate === 'string' ? a.dueDate.slice(0, 10) : ''
      const bd = typeof b.dueDate === 'string' ? b.dueDate.slice(0, 10) : ''
      if (ad && bd) return ad.localeCompare(bd)
      if (ad !== bd) return ad ? -1 : 1
      return 0
    })
    .slice(0, MAX_TASKS)
    .map(t => ({
      id: t.id,
      title: t.title ?? '',
      dueDate: typeof t.dueDate === 'string' ? t.dueDate.slice(0, 10) : '',
      className: names[t.classId] ?? '',
      classColor: colors[t.classId] ?? null,
      overdue: overdueOf(t),
    }))
}

export function allEvents(state) {
  const extra = Array.isArray(state.widgetExtraEvents) ? state.widgetExtraEvents : []
  return [...(state.events ?? []), ...extra]
}

export function buildTodayProjection(state, dayKey) {
  const events = allEvents(state)
    .filter(e => occursOn(e, dayKey))
    .map(e => ({
      id: e.id,
      title: e.title ?? '',
      time: timeOf(e),
      allDay: e.allDay !== false && !timeOf(e),
    }))

  const dueToday = mergedTasks(state)
    .filter(t => !t.done && typeof t.dueDate === 'string' && t.dueDate.slice(0, 10) === dayKey)
    .map(t => ({ id: t.id, title: t.title ?? '', time: '', allDay: true }))

  return [...events, ...dueToday]
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
      return a.time.localeCompare(b.time)
    })
    .slice(0, MAX_EVENTS)
}

export function buildKanbanProjection(state) {
  const noneMode = (state.settings?.semesterMode ?? 'semesters') === 'none'
  const boardId = (noneMode ? null : state.activeSemesterId) ?? FREE_BOARD_ID
  const { columns: rawColumns, cards } = mergedKanban(state, boardId)
  const columns = sortByOrder(rawColumns)
  if (columns.length === 0) return []

  const byColumn = {}
  for (const card of cards) {
    const columnId = card.columnId
    if (!columnId) continue
    if (!byColumn[columnId]) byColumn[columnId] = []
    byColumn[columnId].push(card)
  }

  return columns.slice(0, MAX_COLUMNS).map(col => {
    const list = byColumn[col.id] ?? []
    return {
      id: col.id,
      title: col.title ?? '',
      count: list.length,
      cards: sortByOrder(list).slice(0, MAX_CARDS).map(card => ({
        id: card.id,
        title: card.title ?? '',
        shared: typeof card.id === 'string' && card.id.startsWith('shared:'),
      })),
    }
  })
}

export function buildAgendaProjection(state, now = new Date(), days = AGENDA_DAYS, max = MAX_AGENDA) {
  const out = []
  let used = 0
  for (let offset = 0; offset < days && used < max; offset += 1) {
    const day = new Date(now)
    day.setDate(day.getDate() + offset)
    const dayKey = toDateKey(day)
    const entries = buildTodayProjection(state, dayKey).slice(0, max - used)
    if (entries.length === 0) continue
    used += entries.length
    out.push({ dayKey, offset, entries })
  }
  return out
}

export function buildCalendarProjection(state, now = new Date(), monthOffset = 0) {
  const anchor = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const todayKey = toDateKey(now)

  const counts = {}
  const bump = key => { counts[key] = (counts[key] ?? 0) + 1 }
  for (const event of allEvents(state)) {
    const keys = eventDateKeys(event)
    if (keys.length === 0) continue
    if (keys.length === 1) {
      bump(keys[0])
      continue
    }
    const cursor = new Date(`${keys[0]}T00:00:00`)
    const last = new Date(`${keys[1]}T00:00:00`)
    while (cursor <= last) {
      bump(toDateKey(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  for (const task of state.tasks ?? []) {
    if (task.done || typeof task.dueDate !== 'string') continue
    bump(task.dueDate.slice(0, 10))
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = (new Date(year, month, 1).getDay() + 6) % 7

  const days = []
  for (let i = 0; i < leading; i += 1) days.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = toDateKey(new Date(year, month, day))
    days.push({
      day,
      dayKey: key,
      count: counts[key] ?? 0,
      today: key === todayKey,
      entries: buildTodayProjection(state, key).slice(0, MAX_DAY_ENTRIES),
    })
  }
  while (days.length % 7 !== 0) days.push(null)

  return { year, month: month + 1, monthOffset, days }
}

export function buildCalendarWeekProjection(state, now = new Date(), weekOffset = 0) {
  const base = new Date(now)
  base.setDate(base.getDate() + weekOffset * 7)
  const monday = new Date(base)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))

  const todayKey = toDateKey(now)
  const days = []
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(monday)
    day.setDate(day.getDate() + i)
    const key = toDateKey(day)
    days.push({
      day: day.getDate(),
      dayKey: key,
      today: key === todayKey,
      entries: buildTodayProjection(state, key).slice(0, MAX_DAY_ENTRIES),
    })
  }
  return { weekOffset, startKey: days[0].dayKey, days }
}

export function buildCalendarDayProjection(state, now = new Date(), dayOffset = 0) {
  const day = new Date(now)
  day.setDate(day.getDate() + dayOffset)
  const key = toDateKey(day)
  return {
    dayOffset,
    dayKey: key,
    today: key === toDateKey(now),
    entries: buildTodayProjection(state, key),
  }
}

export function buildCalendarYearProjection(state, now = new Date(), yearOffset = 0) {
  const year = now.getFullYear() + yearOffset
  const counts = {}
  for (const event of allEvents(state)) {
    for (const key of eventDateKeys(event)) {
      if (!key.startsWith(String(year))) continue
      const month = Number(key.slice(5, 7))
      counts[month] = (counts[month] ?? 0) + 1
    }
  }
  for (const task of mergedTasks(state)) {
    if (task.done || typeof task.dueDate !== 'string') continue
    const key = task.dueDate.slice(0, 10)
    if (!key.startsWith(String(year))) continue
    const month = Number(key.slice(5, 7))
    counts[month] = (counts[month] ?? 0) + 1
  }

  return {
    year,
    yearOffset,
    currentMonth: now.getFullYear() === year ? now.getMonth() + 1 : 0,
    months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: counts[i + 1] ?? 0 })),
  }
}

export function buildHabitsProjection(state, now = new Date()) {
  if (state.settings?.apps?.habits !== true) return []
  return (state.habits ?? [])
    .filter(habit => !isRestDay(habit, now))
    .slice(0, MAX_HABITS)
    .map(habit => ({
      id: habit.id,
      title: habit.title ?? '',
      done: isCheckedIn(habit, currentPeriodKey(habit, now)),
      streak: habitStreak(habit, now).current,
      color: habit.color ?? null,
    }))
}

export function buildProgressProjection(state, ctx = weekContextFor(state)) {
  const names = classNameById(state.classes)
  const colors = classColorById(state.classes)
  const scoped = mergedTasks(state)
    .filter(t => t.views?.list !== false)
    .filter(t => inCurrentWeek(t, ctx))

  const groups = new Map()
  for (const task of scoped) {
    const key = task.classId ?? ''
    if (!groups.has(key)) groups.set(key, { done: 0, total: 0 })
    const group = groups.get(key)
    group.total += 1
    if (task.done) group.done += 1
  }

  const done = scoped.filter(t => t.done).length
  return {
    done,
    total: scoped.length,
    classes: [...groups.entries()].map(([id, g]) => ({
      id,
      name: names[id] ?? '',
      color: colors[id] ?? null,
      done: g.done,
      total: g.total,
    })),
  }
}

export function buildPomodoroProjection(state, now = new Date()) {
  if (state.settings?.pomodoro?.enabled !== true) {
    return { enabled: false, completed: 0, abandoned: 0, focusSecs: 0, tomatoes: [] }
  }

  const period = state.settings?.pomodoro?.resetPeriod ?? 'week'
  const since = getPeriodStart(period)
  const list = (state.pomodoros ?? []).filter(p => {
    const ts = getPomodoroTimestamp(p)
    return !Number.isFinite(since) || !Number.isFinite(ts) || ts >= since
  })

  let completed = 0
  let abandoned = 0
  let focusSecs = 0
  for (const p of list) {
    completed += getPomodoroCompletedCount(p)
    abandoned += getPomodoroAbandonedCount(p)
    focusSecs += getPomodoroFocusSecs(p)
  }

  const tomatoes = list
    .slice(-MAX_TOMATOES)
    .map(p => ({
      pct: Number.isFinite(p?.pct) ? Math.min(1, Math.max(0, p.pct)) : 1,
      abandoned: !!p?.abandoned,
    }))

  const sync = state.focusSync ?? {}
  const running = sync.status === 'started'
  const timer = {
    running,
    phase: sync.phase === 'break' ? 'break' : 'focus',
    startedAt: Number.isFinite(sync.startedAt) ? sync.startedAt : null,
    cycleElapsedBase: Number.isFinite(sync.cycleElapsedBase) ? sync.cycleElapsedBase : 0,
    intervalSecs: Math.max(0, Number(state.settings?.focus?.intervalMins ?? 25) * 60),
  }

  return { enabled: true, completed, abandoned, focusSecs, tomatoes, period, timer, dayKey: toDateKey(now) }
}

export function buildSummaryProjection(state, dayKey, tasks, today, habits) {
  return {
    habitsEnabled: state.settings?.apps?.habits === true,
    overdue: tasks.filter(t => t.overdue).length,
    dueToday: (state.tasks ?? []).filter(
      t => !t.done && typeof t.dueDate === 'string' && t.dueDate.slice(0, 10) === dayKey,
    ).length,
    tasksOpen: tasks.length,
    eventsToday: today.length,
    habitsPending: habits.filter(g => !g.done).length,
  }
}

export function buildProjection(state, now = new Date()) {
  const dayKey = toDateKey(now)
  const tasks = buildTasksProjection(state, dayKey, weekContextFor(state))
  const today = buildTodayProjection(state, dayKey)
  const habits = buildHabitsProjection(state, now)
  return {
    version: PROJECTION_VERSION,
    updatedAt: now.getTime(),
    dayKey,
    tasks,
    today,
    kanban: buildKanbanProjection(state),
    progress: buildProgressProjection(state),
    pomodoro: buildPomodoroProjection(state, now),
    agenda: buildAgendaProjection(state, now),
    calendar: [-1, 0, 1].map(offset => buildCalendarProjection(state, now, offset)),
    calendarWeeks: [-1, 0, 1].map(offset => buildCalendarWeekProjection(state, now, offset)),
    calendarDays: [-1, 0, 1].map(offset => buildCalendarDayProjection(state, now, offset)),
    calendarYears: [-1, 0, 1].map(offset => buildCalendarYearProjection(state, now, offset)),
    habits,
    summary: buildSummaryProjection(state, dayKey, tasks, today, habits),
  }
}

export function emptyProjection(now = new Date()) {
  return {
    version: PROJECTION_VERSION,
    updatedAt: now.getTime(),
    dayKey: toDateKey(now),
    tasks: [],
    today: [],
    agenda: [],
    calendar: [],
    calendarWeeks: [],
    calendarDays: [],
    calendarYears: [],
    progress: { done: 0, total: 0, classes: [] },
    pomodoro: { enabled: false, completed: 0, abandoned: 0, focusSecs: 0, tomatoes: [] },
    habits: [],
    summary: { overdue: 0, dueToday: 0, tasksOpen: 0, eventsToday: 0, habitsPending: 0 },
    kanban: [],
  }
}
