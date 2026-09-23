import { FACE_COUNT, POMODORO_UNITS_MAX, growthFromSecs } from '@/components/focus/pomodoro/utils'

export const AWAY_GRACE_SECS = 60
const MAX_TOMATO_TILT_DEG = 20
const MAX_SCHEDULE_LOOKBACK_DAYS = 8
const MAX_CATCH_UP_STEPS = 500
const SECS_PER_DAY = 24 * 60 * 60

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback
}

export function focusCycleId(focusSync) {
  if (!Number.isFinite(focusSync?.startedAt)) return null
  return `focus-${focusSync.startedAt - finiteOr(focusSync.cycleElapsedBase, 0)}`
}

export function totalAfterBreak(totalElapsed, resetMode) {
  return resetMode === 'continue' ? totalElapsed : 0
}

function pausedFocus(totalElapsedBase) {
  return {
    status: 'paused',
    phase: 'focus',
    startedAt: null,
    cycleElapsedBase: 0,
    totalElapsedBase,
    breakSecsLeftBase: 0,
    activeBreakSource: null,
  }
}

function localMidnightSecs(secs, dayOffset) {
  const date = new Date(secs * 1000)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + dayOffset)
  return Math.floor(date.getTime() / 1000)
}

export function firstScheduledBreakBetween(scheduledTimes, fromSecs, toSecs) {
  if (!Array.isArray(scheduledTimes) || !scheduledTimes.length || toSecs <= fromSecs) return null
  const minutesOfDay = [...scheduledTimes].sort((a, b) => a - b)
  for (let day = 0; day <= MAX_SCHEDULE_LOOKBACK_DAYS; day++) {
    const midnight = localMidnightSecs(fromSecs, day)
    if (midnight > toSecs) return null
    const hit = minutesOfDay.map(mins => midnight + mins * 60).find(at => at > fromSecs && at <= toSecs)
    if (hit !== undefined) return hit
  }
  return null
}

function nextBreakStart(state, config) {
  const candidates = []
  if (config.useInterval) {
    const at = state.startedAt + Math.max(0, config.intervalSecs - finiteOr(state.cycleElapsedBase, 0))
    candidates.push({ at, breakSecs: config.intervalBreakSecs, source: 'interval' })
  }
  if (config.useScheduled) {
    const horizon = state.startedAt + (MAX_SCHEDULE_LOOKBACK_DAYS + 1) * SECS_PER_DAY
    const at = firstScheduledBreakBetween(config.scheduledTimes, state.startedAt, horizon)
    if (at !== null) candidates.push({ at, breakSecs: config.scheduledBreakSecs, source: 'scheduled' })
  }
  const first = candidates.sort((a, b) => a.at - b.at)[0]
  return first ? { type: 'breakStart', ...first } : null
}

export function nextFocusTransition(state, config) {
  if (state?.status !== 'started' || !Number.isFinite(state?.startedAt)) return null
  if (state.phase === 'break') {
    return { type: 'focusStart', at: state.startedAt + Math.max(0, finiteOr(state.breakSecsLeftBase, 0)) }
  }
  return nextBreakStart(state, config)
}

function applyTransition(state, transition, config) {
  const totalElapsedBase = finiteOr(state.totalElapsedBase, 0)
  if (transition.type === 'focusStart') {
    return {
      state: {
        status: 'started',
        phase: 'focus',
        startedAt: transition.at,
        cycleElapsedBase: 0,
        totalElapsedBase: totalAfterBreak(totalElapsedBase, config.resetMode),
        breakSecsLeftBase: 0,
        activeBreakSource: null,
      },
      event: { type: 'focusStarted', at: transition.at },
    }
  }

  const focusedSinceStart = transition.at - state.startedAt
  const focusSecs = finiteOr(state.cycleElapsedBase, 0) + focusedSinceStart
  return {
    state: {
      status: 'started',
      phase: 'break',
      startedAt: transition.at,
      cycleElapsedBase: focusSecs,
      totalElapsedBase: totalElapsedBase + focusedSinceStart,
      breakSecsLeftBase: transition.breakSecs,
      activeBreakSource: transition.source,
    },
    event: { type: 'breakStarted', at: transition.at, completedFocus: { id: focusCycleId(state), focusSecs } },
  }
}

export function advanceFocusClock(focusSync, nowSecs, config, { unattended = false } = {}) {
  let state = focusSync
  const events = []
  for (let step = 0; step < MAX_CATCH_UP_STEPS; step++) {
    const transition = nextFocusTransition(state, config)
    if (!transition || transition.at > nowSecs) break
    const missedWholeBreak = transition.type === 'focusStart' && nowSecs > transition.at + AWAY_GRACE_SECS
    if (unattended && missedWholeBreak) {
      state = pausedFocus(totalAfterBreak(finiteOr(state.totalElapsedBase, 0), config.resetMode))
      events.push({ type: 'pausedWhileAway', at: transition.at })
      break
    }
    const applied = applyTransition(state, transition, config)
    state = applied.state
    events.push(applied.event)
  }
  return { state, events }
}

export function createFocusTomato({ id, focusSecs, trackStats, createdAt, random = Math.random }) {
  const clampedFocusSecs = Math.max(0, Math.min(POMODORO_UNITS_MAX * 600, focusSecs ?? 0))
  return {
    id,
    face: Math.floor(random() * FACE_COUNT),
    abandoned: false,
    pct: growthFromSecs(clampedFocusSecs),
    colorPct: 1,
    rotation: random() * MAX_TOMATO_TILT_DEG * 2 - MAX_TOMATO_TILT_DEG,
    createdAt,
    ...(trackStats ? { focusSecs: clampedFocusSecs } : {}),
  }
}
