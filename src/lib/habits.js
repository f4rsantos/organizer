import { addDays, differenceInCalendarDays, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'

export const HABIT_CADENCES = [1, 2, 3, 7, 30, 'custom']
export const CUSTOM_CADENCE = 'custom'

export function isCustomCadence(cadenceDays) {
  return cadenceDays === CUSTOM_CADENCE
}

export function normalizeWeekdays(weekdays) {
  const cleaned = (Array.isArray(weekdays) ? weekdays : [])
    .filter(d => Number.isInteger(d) && d >= 0 && d <= 6)
  return [...new Set(cleaned)].sort((a, b) => a - b)
}

function isSelectedWeekday(date, weekdays) {
  return weekdays.includes(date.getDay())
}

export function toDayKey(date) {
  return format(date, 'yyyy-MM-dd')
}

export function anchorDateOf(habit) {
  const created = Number.isFinite(habit?.createdAt) ? new Date(habit.createdAt) : new Date()
  return startOfDay(created)
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function periodStartFor(date, cadenceDays, anchor) {
  const day = startOfDay(date)
  if (isCustomCadence(cadenceDays)) return day
  if (cadenceDays === 7) return startOfWeek(day, { weekStartsOn: 1 })
  if (cadenceDays === 30) return startOfMonth(day)
  if (cadenceDays === 1) return day
  const base = startOfDay(anchor)
  const diff = differenceInCalendarDays(day, base)
  const offset = Math.floor(diff / cadenceDays) * cadenceDays
  return addDays(base, offset)
}

export function periodKeyFor(date, cadenceDays, anchor) {
  return toDayKey(periodStartFor(date, cadenceDays, anchor))
}

export function nextPeriodStart(periodStart, cadenceDays) {
  if (cadenceDays === 30) return startOfMonth(addDays(startOfMonth(periodStart), 32))
  if (cadenceDays === 7) return addDays(periodStart, 7)
  return addDays(periodStart, cadenceDays)
}

export function periodsBetween(habit, from, to) {
  const cadence = habit?.cadenceDays ?? 1
  const anchor = anchorDateOf(habit)
  const end = periodStartFor(to, cadence, anchor)
  let cursor = periodStartFor(from, cadence, anchor)
  const out = []
  let guard = 0

  if (isCustomCadence(cadence)) {
    const weekdays = normalizeWeekdays(habit?.weekdays)
    if (weekdays.length === 0) return []
    while (cursor <= end && guard < 3000) {
      out.push({ key: toDayKey(cursor), start: cursor, rest: !isSelectedWeekday(cursor, weekdays) })
      cursor = addDays(cursor, 1)
      guard += 1
    }
    return out
  }

  while (cursor <= end && guard < 2000) {
    out.push({ key: toDayKey(cursor), start: cursor, rest: false })
    cursor = nextPeriodStart(cursor, cadence)
    guard += 1
  }
  return out
}

export function currentPeriodKey(habit, now = new Date()) {
  if (isCustomCadence(habit?.cadenceDays)) {
    const weekdays = normalizeWeekdays(habit?.weekdays)
    if (!isSelectedWeekday(startOfDay(now), weekdays)) return null
  }
  return periodKeyFor(now, habit?.cadenceDays ?? 1, anchorDateOf(habit))
}

export function isCheckedIn(habit, periodKey) {
  if (!periodKey) return false
  return Boolean(habit?.checkIns?.[periodKey])
}

export function isRestDay(habit, now = new Date()) {
  return currentPeriodKey(habit, now) === null
}

export function isPending(habit, now = new Date()) {
  const key = currentPeriodKey(habit, now)
  if (!key) return false
  return !isCheckedIn(habit, key)
}

function checkInDayWithin(entry, periodStart, periodEnd, now) {
  if (!Number.isFinite(entry?.at) || entry.at <= 0) return null
  const day = startOfDay(new Date(entry.at))
  if (Number.isNaN(day.getTime())) return null
  if (day < periodStart) return null
  const limit = periodEnd < now ? periodEnd : startOfDay(now)
  return day > limit ? limit : day
}

export function habitPeriods(habit, now = new Date()) {
  if (!habit) return []
  const cadence = habit.cadenceDays ?? 1
  const periods = periodsBetween(habit, anchorDateOf(habit), now)
  const currentKey = currentPeriodKey(habit, now)
  const todayStart = startOfDay(now)
  const today = toDayKey(todayStart)
  return periods.map(p => {
    const current = p.rest ? p.key === today : p.key === currentKey
    const entry = p.rest ? null : habit.checkIns?.[p.key]
    const done = !p.rest && isCheckedIn(habit, p.key)
    const lastDay = p.rest
      ? p.start
      : addDays(nextPeriodStart(p.start, cadence), -1)
    const checkedOn = done ? checkInDayWithin(entry, p.start, lastDay, now) : null
    return {
      ...p,
      done,
      current,
      displayStart: checkedOn ?? (current ? todayStart : p.start),
      note: p.rest ? '' : (entry?.note ?? ''),
    }
  })
}

export function habitStreak(habit, now = new Date()) {
  const periods = habitPeriods(habit, now).filter(p => !p.rest)
  const total = periods.filter(p => p.done).length

  let best = 0
  let run = 0
  for (const p of periods) {
    if (p.done) {
      run += 1
      if (run > best) best = run
    } else {
      run = 0
    }
  }

  let current = 0
  for (let i = periods.length - 1; i >= 0; i -= 1) {
    const p = periods[i]
    if (p.done) {
      current += 1
      continue
    }
    if (p.current) continue
    break
  }

  return { current, best, total, periods: periods.length }
}

export function isRescue(habit, now = new Date()) {
  const periods = habitPeriods(habit, now).filter(p => !p.rest)
  if (periods.length < 2) return false
  const previous = periods[periods.length - 2]
  return !previous.done
}

export function habitTarget(habit) {
  const kind = habit?.targetKind
  if (kind === 'count' && Number.isFinite(habit?.targetCount) && habit.targetCount > 0) {
    return { kind: 'count', count: Math.trunc(habit.targetCount) }
  }
  if (kind === 'date' && typeof habit?.targetDate === 'string' && habit.targetDate) {
    return { kind: 'date', date: habit.targetDate }
  }
  return { kind: 'endless' }
}

export function habitCompletion(habit, now = new Date()) {
  const target = habitTarget(habit)
  const { total } = habitStreak(habit, now)

  if (target.kind === 'count') {
    return {
      ...target,
      done: total >= target.count,
      progress: Math.min(1, total / target.count),
      remaining: Math.max(0, target.count - total),
    }
  }

  if (target.kind === 'date') {
    const end = parseDayKey(target.date)
    const today = startOfDay(now)
    const daysLeft = end ? differenceInCalendarDays(end, today) : null
    return { ...target, done: daysLeft !== null && daysLeft < 0, daysLeft, progress: null }
  }

  return { kind: 'endless', done: false, progress: null }
}

export function completionRate(habit, now = new Date()) {
  const periods = habitPeriods(habit, now).filter(p => !p.rest)
  const elapsed = periods.filter(p => !p.current).length
  if (elapsed === 0) return periods.some(p => p.done) ? 100 : 0
  const done = periods.filter(p => p.done && !p.current).length
  return Math.round((done / elapsed) * 100)
}

export function groupPeriodsForCalendar(periods) {
  const months = []
  for (const period of periods) {
    const at = period.displayStart ?? period.start
    const monthKey = format(at, 'yyyy-MM')
    let month = months[months.length - 1]
    if (!month || month.key !== monthKey) {
      month = { key: monthKey, start: startOfMonth(at), rows: [] }
      months.push(month)
    }
    const weekStart = startOfWeek(at, { weekStartsOn: 1 })
    const weekKey = toDayKey(weekStart)
    let row = month.rows[month.rows.length - 1]
    if (!row || row.key !== weekKey) {
      row = { key: weekKey, cells: new Array(7).fill(null) }
      month.rows.push(row)
    }
    row.cells[differenceInCalendarDays(at, weekStart)] = period
  }
  return months
}

export function parseDayKey(dayKey) {
  if (typeof dayKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null
  const parsed = parseISO(dayKey)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
