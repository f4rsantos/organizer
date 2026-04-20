export const FACE_COUNT = 5
export const TOMATO_RADIUS = 28
export const GRAVITY = 800
export const DAMPING = 0.55
export const FRICTION = 0.82
export const MIN_VX = 0.5

export const POMODORO_UNITS_MAX = 120
export const LEGACY_FULL_PCT_UNITS = 2.5
export const MAX_TOMATO_SCALE = 5
export const WEEK_STARTS_ON = 0

export function isPomodoroAggregate(pomodoro) {
  return pomodoro?.kind === 'aggregate'
}

export function sizeFromPct(pct) {
  const raw = Math.max(0, Number.isFinite(pct) ? pct : 0)
  // Backward compatibility: legacy pct was 0..1 where 1 == 2.5 new units.
  const units = raw <= 1 ? raw * LEGACY_FULL_PCT_UNITS : raw
  const clampedUnits = Math.min(POMODORO_UNITS_MAX, Math.max(0, units))

  const baseMinSize = 20
  const baseFullSize = 56
  const maxSize = Math.round(baseFullSize * MAX_TOMATO_SCALE)

  if (clampedUnits <= LEGACY_FULL_PCT_UNITS) {
    const t = clampedUnits / LEGACY_FULL_PCT_UNITS
    return Math.round(baseMinSize + t * (baseFullSize - baseMinSize))
  }

  const t = (clampedUnits - LEGACY_FULL_PCT_UNITS) / (POMODORO_UNITS_MAX - LEGACY_FULL_PCT_UNITS)
  return Math.round(baseFullSize + t * (maxSize - baseFullSize))
}

export function growthFromSecs(secs) {
  // New unit system: 2.5 units for a 25 minute pomodoro (minutes / 10).
  return Math.min(POMODORO_UNITS_MAX, Math.max(0, secs) / 600)
}

export function getPomodoroFocusSecs(pomodoro) {
  if (isPomodoroAggregate(pomodoro)) {
    const completed = Math.max(0, Number(pomodoro?.completedCount) || 0)
    const abandoned = Math.max(0, Number(pomodoro?.abandonedCount) || 0)
    const baseFocus = Math.max(0, Number(pomodoro?.focusSecs) || 0)
    return baseFocus + completed + abandoned
  }

  if (typeof pomodoro?.focusSecs === 'number' && Number.isFinite(pomodoro.focusSecs)) {
    return Math.max(0, pomodoro.focusSecs) + 1
  }

  const pctRaw = Number.isFinite(pomodoro?.pct) ? pomodoro.pct : (pomodoro?.abandoned ? 0 : LEGACY_FULL_PCT_UNITS)
  const units = pctRaw <= 1 ? pctRaw * LEGACY_FULL_PCT_UNITS : pctRaw
  const clampedUnits = Math.min(POMODORO_UNITS_MAX, Math.max(0, units))

  // Unit model: 1 unit = 10 minutes.
  return Math.round(clampedUnits * 600) + 1
}

export function getPomodoroCompletedCount(pomodoro) {
  if (isPomodoroAggregate(pomodoro)) {
    return Math.max(0, Number(pomodoro?.completedCount) || 0)
  }
  return pomodoro?.abandoned ? 0 : 1
}

export function getPomodoroAbandonedCount(pomodoro) {
  if (isPomodoroAggregate(pomodoro)) {
    return Math.max(0, Number(pomodoro?.abandonedCount) || 0)
  }
  return pomodoro?.abandoned ? 1 : 0
}

export function colorFromPct(pct) {
  const clamped = Math.min(1, Math.max(0, pct ?? 0))
  const green = [34, 197, 94]
  const yellow = [234, 179, 8]
  const red = [220, 52, 52]
  const lerp = (a, b, t) => Math.round(a + (b - a) * t)

  if (clamped <= 0.5) {
    const t = clamped / 0.5
    return `rgb(${lerp(green[0], yellow[0], t)},${lerp(green[1], yellow[1], t)},${lerp(green[2], yellow[2], t)})`
  }

  const t = (clamped - 0.5) / 0.5
  return `rgb(${lerp(yellow[0], red[0], t)},${lerp(yellow[1], red[1], t)},${lerp(yellow[2], red[2], t)})`
}

export function startOfWeekLocal(ts, weekStartsOn = WEEK_STARTS_ON) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  d.setDate(d.getDate() - diff)
  return d.getTime()
}

export function getPeriodStart(period) {
  const now = new Date()
  if (period === 'day') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (period === 'week') {
    return startOfWeekLocal(now.getTime())
  }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  return 0
}

export function getPomodoroTimestamp(pomodoro) {
  if (typeof pomodoro?.createdAt === 'number' && Number.isFinite(pomodoro.createdAt)) {
    return pomodoro.createdAt
  }

  if (typeof pomodoro?.createdAt === 'string') {
    const parsed = Date.parse(pomodoro.createdAt)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  if (pomodoro?.createdAt instanceof Date) {
    const parsed = pomodoro.createdAt.getTime()
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  // Older entries may only have numeric ids; recover timestamp when possible.
  const idNum = Number.parseFloat(String(pomodoro?.id ?? ''))
  if (Number.isFinite(idNum) && idNum > 0) return idNum

  return 0
}

export function fmtDuration(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function getPeriodPomodoros(pomodoros, period) {
  if (period === 'semester') return pomodoros
  const start = getPeriodStart(period)
  return pomodoros.filter(p => getPomodoroTimestamp(p) >= start)
}

export function getPrevPeriodPomodoros(pomodoros, period) {
  if (period === 'semester') return []
  const now = getPeriodStart(period)
  let prev
  if (period === 'day') prev = now - 86400000
  else if (period === 'week') prev = now - 7 * 86400000
  else prev = new Date(new Date(now).setMonth(new Date(now).getMonth() - 1)).getTime()
  return pomodoros.filter(p => {
    const ts = getPomodoroTimestamp(p)
    return ts >= prev && ts < now
  })
}
