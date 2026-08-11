import { addDays, differenceInCalendarDays, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'

export const GOAL_CADENCES = [1, 2, 3, 7, 30, 'custom']
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

export function anchorDateOf(goal) {
  const created = Number.isFinite(goal?.createdAt) ? new Date(goal.createdAt) : new Date()
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

export function periodsBetween(goal, from, to) {
  const cadence = goal?.cadenceDays ?? 1
  const anchor = anchorDateOf(goal)
  const end = periodStartFor(to, cadence, anchor)
  let cursor = periodStartFor(from, cadence, anchor)
  const out = []
  let guard = 0

  if (isCustomCadence(cadence)) {
    const weekdays = normalizeWeekdays(goal?.weekdays)
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

export function currentPeriodKey(goal, now = new Date()) {
  if (isCustomCadence(goal?.cadenceDays)) {
    const weekdays = normalizeWeekdays(goal?.weekdays)
    if (!isSelectedWeekday(startOfDay(now), weekdays)) return null
  }
  return periodKeyFor(now, goal?.cadenceDays ?? 1, anchorDateOf(goal))
}

export function isCheckedIn(goal, periodKey) {
  if (!periodKey) return false
  return Boolean(goal?.checkIns?.[periodKey])
}

export function isRestDay(goal, now = new Date()) {
  return currentPeriodKey(goal, now) === null
}

export function isPending(goal, now = new Date()) {
  const key = currentPeriodKey(goal, now)
  if (!key) return false
  return !isCheckedIn(goal, key)
}

export function goalPeriods(goal, now = new Date()) {
  if (!goal) return []
  const periods = periodsBetween(goal, anchorDateOf(goal), now)
  const currentKey = currentPeriodKey(goal, now)
  const today = toDayKey(startOfDay(now))
  return periods.map(p => ({
    ...p,
    done: !p.rest && isCheckedIn(goal, p.key),
    current: p.rest ? p.key === today : p.key === currentKey,
    note: p.rest ? '' : (goal.checkIns?.[p.key]?.note ?? ''),
  }))
}

export function goalStreak(goal, now = new Date()) {
  const periods = goalPeriods(goal, now).filter(p => !p.rest)
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

export function isRescue(goal, now = new Date()) {
  const periods = goalPeriods(goal, now).filter(p => !p.rest)
  if (periods.length < 2) return false
  const previous = periods[periods.length - 2]
  return !previous.done
}

export function goalTarget(goal) {
  const kind = goal?.targetKind
  if (kind === 'count' && Number.isFinite(goal?.targetCount) && goal.targetCount > 0) {
    return { kind: 'count', count: Math.trunc(goal.targetCount) }
  }
  if (kind === 'date' && typeof goal?.targetDate === 'string' && goal.targetDate) {
    return { kind: 'date', date: goal.targetDate }
  }
  return { kind: 'endless' }
}

export function goalCompletion(goal, now = new Date()) {
  const target = goalTarget(goal)
  const { total } = goalStreak(goal, now)

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

export function completionRate(goal, now = new Date()) {
  const periods = goalPeriods(goal, now).filter(p => !p.rest)
  const elapsed = periods.filter(p => !p.current).length
  if (elapsed === 0) return periods.some(p => p.done) ? 100 : 0
  const done = periods.filter(p => p.done && !p.current).length
  return Math.round((done / elapsed) * 100)
}

export function groupPeriodsForCalendar(periods) {
  const months = []
  for (const period of periods) {
    const monthKey = format(period.start, 'yyyy-MM')
    let month = months[months.length - 1]
    if (!month || month.key !== monthKey) {
      month = { key: monthKey, start: startOfMonth(period.start), rows: [] }
      months.push(month)
    }
    const weekKey = toDayKey(startOfWeek(period.start, { weekStartsOn: 1 }))
    let row = month.rows[month.rows.length - 1]
    if (!row || row.key !== weekKey) {
      row = { key: weekKey, cells: [] }
      month.rows.push(row)
    }
    row.cells.push(period)
  }
  return months
}

export function parseDayKey(dayKey) {
  if (typeof dayKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null
  const parsed = parseISO(dayKey)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
