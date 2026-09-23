import { describe, it, expect } from 'vitest'
import {
  AWAY_GRACE_SECS, advanceFocusClock, createFocusTomato, firstScheduledBreakBetween, focusCycleId, nextFocusTransition,
} from '../../../src/lib/focus/focusCycle.js'

const INTERVAL_SECS = 25 * 60
const BREAK_SECS = 5 * 60
const STARTED_AT = 1_000_000

const runningFocus = (fields = {}) => ({
  status: 'started',
  phase: 'focus',
  startedAt: STARTED_AT,
  cycleElapsedBase: 0,
  totalElapsedBase: 0,
  breakSecsLeftBase: 0,
  activeBreakSource: null,
  ...fields,
})

const INTERVAL_CONFIG = {
  useInterval: true,
  intervalSecs: INTERVAL_SECS,
  intervalBreakSecs: BREAK_SECS,
  useScheduled: false,
  scheduledTimes: [],
  scheduledBreakSecs: 0,
  resetMode: 'reset',
}

const localSecs = (day, hours, minutes = 0) => Math.floor(new Date(2026, 8, day, hours, minutes).getTime() / 1000)

function advanceAfter(gapSecs, { focusSync = runningFocus(), unattended = false, config = {} } = {}) {
  return advanceFocusClock(focusSync, STARTED_AT + gapSecs, { ...INTERVAL_CONFIG, ...config }, { unattended })
}

describe('focusCycleId', () => {
  it('is the same for every clock and device reading the same timer state', () => {
    expect(focusCycleId(runningFocus())).toBe(focusCycleId({ ...runningFocus() }))
  })

  it('shifts with pauses but holds steady while the cycle runs', () => {
    const beforePause = runningFocus({ startedAt: STARTED_AT, cycleElapsedBase: 0 })
    const afterResume = runningFocus({ startedAt: STARTED_AT + 600, cycleElapsedBase: 300 })
    expect(focusCycleId(afterResume)).not.toBe(focusCycleId(beforePause))
    expect(focusCycleId(afterResume)).toBe(focusCycleId(runningFocus({ startedAt: STARTED_AT + 900, cycleElapsedBase: 600 })))
  })

  it('is null without a running timer', () => {
    expect(focusCycleId({ status: 'paused', startedAt: null })).toBeNull()
  })
})

describe('advanceFocusClock while the app is running', () => {
  it('starts the break at the moment the interval ended, not when the tick ran', () => {
    const { state, events } = advanceAfter(INTERVAL_SECS + 45)
    expect(events).toEqual([{
      type: 'breakStarted',
      at: STARTED_AT + INTERVAL_SECS,
      completedFocus: { id: focusCycleId(runningFocus()), focusSecs: INTERVAL_SECS },
    }])
    expect(state).toMatchObject({ phase: 'break', startedAt: STARTED_AT + INTERVAL_SECS, breakSecsLeftBase: BREAK_SECS })
  })

  it('ends the break on time and starts the next focus at the exact break end', () => {
    const { state, events } = advanceAfter(INTERVAL_SECS + BREAK_SECS + 50)
    expect(events.map(e => [e.type, e.at])).toEqual([
      ['breakStarted', STARTED_AT + INTERVAL_SECS],
      ['focusStarted', STARTED_AT + INTERVAL_SECS + BREAK_SECS],
    ])
    expect(state).toMatchObject({
      status: 'started',
      phase: 'focus',
      startedAt: STARTED_AT + INTERVAL_SECS + BREAK_SECS,
      cycleElapsedBase: 0,
    })
  })

  it('catches up several cycles after throttling, one tomato each', () => {
    const cycle = INTERVAL_SECS + BREAK_SECS
    const { events } = advanceAfter(cycle * 2 + 10)
    const tomatoIds = events.filter(e => e.completedFocus).map(e => e.completedFocus.id)
    expect(tomatoIds).toEqual([`focus-${STARTED_AT}`, `focus-${STARTED_AT + cycle}`])
  })

  it('does nothing before the interval ends', () => {
    expect(advanceAfter(INTERVAL_SECS - 1).events).toEqual([])
    expect(advanceAfter(0).events).toEqual([])
  })

  it('does nothing for a paused timer or a timer without breaks', () => {
    expect(advanceAfter(INTERVAL_SECS * 4, { focusSync: runningFocus({ status: 'paused' }) }).events).toEqual([])
    expect(advanceAfter(INTERVAL_SECS * 4, { config: { useInterval: false } }).events).toEqual([])
  })

  it('keeps the total across breaks when the reset mode continues', () => {
    const { state } = advanceAfter(INTERVAL_SECS + BREAK_SECS + 1, {
      focusSync: runningFocus({ totalElapsedBase: 100 }),
      config: { resetMode: 'continue' },
    })
    expect(state.totalElapsedBase).toBe(100 + INTERVAL_SECS)
  })
})

describe('advanceFocusClock after the app was not running', () => {
  it('credits the tomato and pauses when the whole break was missed', () => {
    const { state, events } = advanceAfter(INTERVAL_SECS + BREAK_SECS + AWAY_GRACE_SECS + 1, { unattended: true })
    expect(events.map(e => e.type)).toEqual(['breakStarted', 'pausedWhileAway'])
    expect(events[0].completedFocus.focusSecs).toBe(INTERVAL_SECS)
    expect(state).toMatchObject({ status: 'paused', phase: 'focus', startedAt: null, cycleElapsedBase: 0 })
  })

  it('counts focus done before a pause toward the tomato', () => {
    const resumed = runningFocus({ cycleElapsedBase: 600, totalElapsedBase: 600 })
    const { events } = advanceAfter(INTERVAL_SECS + BREAK_SECS + AWAY_GRACE_SECS, { focusSync: resumed, unattended: true })
    expect(events[0].completedFocus.focusSecs).toBe(INTERVAL_SECS)
  })

  it('drops back into a break that is still running with the time it has left', () => {
    const { state } = advanceAfter(INTERVAL_SECS + 120, { unattended: true })
    expect(state).toMatchObject({
      status: 'started',
      phase: 'break',
      startedAt: STARTED_AT + INTERVAL_SECS,
      activeBreakSource: 'interval',
    })
  })

  it('continues normally when the break ended within the grace window', () => {
    const { state } = advanceAfter(INTERVAL_SECS + BREAK_SECS + AWAY_GRACE_SECS, { unattended: true })
    expect(state).toMatchObject({ status: 'started', phase: 'focus', startedAt: STARTED_AT + INTERVAL_SECS + BREAK_SECS })
  })

  it('uses the interval break length, not the scheduled one', () => {
    const gap = INTERVAL_SECS + BREAK_SECS + AWAY_GRACE_SECS + 1
    const scheduled = { scheduledBreakSecs: 60 * 60 }
    expect(advanceAfter(gap, { unattended: true, config: { ...scheduled, intervalBreakSecs: BREAK_SECS } }).state.status).toBe('paused')
    expect(advanceAfter(gap, { unattended: true, config: { ...scheduled, intervalBreakSecs: BREAK_SECS + 120 } }).state.phase).toBe('break')
  })

  it('ends a long-finished break without another tomato', () => {
    const onBreak = runningFocus({ phase: 'break', breakSecsLeftBase: BREAK_SECS, activeBreakSource: 'interval' })
    const { state, events } = advanceAfter(BREAK_SECS + AWAY_GRACE_SECS + 1, { focusSync: onBreak, unattended: true })
    expect(events).toEqual([{ type: 'pausedWhileAway', at: STARTED_AT + BREAK_SECS }])
    expect(state.phase).toBe('focus')
  })
})

describe('nextFocusTransition', () => {
  it('points at the break end during a break', () => {
    const onBreak = runningFocus({ phase: 'break', breakSecsLeftBase: 200 })
    expect(nextFocusTransition(onBreak, INTERVAL_CONFIG)).toEqual({ type: 'focusStart', at: STARTED_AT + 200 })
  })

  it('points at the interval end during focus', () => {
    expect(nextFocusTransition(runningFocus({ cycleElapsedBase: 100 }), INTERVAL_CONFIG).at).toBe(STARTED_AT + INTERVAL_SECS - 100)
  })

  it('is null while paused', () => {
    expect(nextFocusTransition(runningFocus({ status: 'paused' }), INTERVAL_CONFIG)).toBeNull()
  })
})

describe('advanceFocusClock in scheduled mode', () => {
  const TEN_AM = 10 * 60
  const SCHEDULED_BREAK_SECS = 10 * 60

  function advanceScheduled({ startedAt, now, scheduledTimes = [TEN_AM], focusSync = {}, useInterval = false, unattended = true }) {
    return advanceFocusClock(runningFocus({ startedAt, ...focusSync }), now, {
      ...INTERVAL_CONFIG,
      useInterval,
      useScheduled: true,
      scheduledTimes,
      scheduledBreakSecs: SCHEDULED_BREAK_SECS,
    }, { unattended })
  }

  it('credits a tomato for a scheduled break that passed while the app was gone', () => {
    const { state, events } = advanceScheduled({ startedAt: localSecs(23, 9, 30), now: localSecs(23, 11) })
    expect(events[0].completedFocus).toEqual({ id: `focus-${localSecs(23, 9, 30)}`, focusSecs: 30 * 60 })
    expect(state).toMatchObject({ status: 'paused', phase: 'focus' })
  })

  it('starts a scheduled break at the scheduled minute', () => {
    const { state } = advanceScheduled({ startedAt: localSecs(23, 9, 30), now: localSecs(23, 10, 2), unattended: false })
    expect(state).toMatchObject({
      phase: 'break',
      startedAt: localSecs(23, 10),
      breakSecsLeftBase: SCHEDULED_BREAK_SECS,
      activeBreakSource: 'scheduled',
      cycleElapsedBase: 30 * 60,
    })
  })

  it('keeps running through a scheduled break when the app was open the whole time', () => {
    const { state, events } = advanceScheduled({ startedAt: localSecs(23, 9, 30), now: localSecs(23, 11), unattended: false })
    expect(events.map(e => e.type)).toEqual(['breakStarted', 'focusStarted'])
    expect(state).toMatchObject({ status: 'started', phase: 'focus', startedAt: localSecs(23, 10, 10) })
  })

  it('counts focus from before a pause toward that tomato', () => {
    const { events } = advanceScheduled({ startedAt: localSecs(23, 9, 30), now: localSecs(23, 11), focusSync: { cycleElapsedBase: 300 } })
    expect(events[0].completedFocus.focusSecs).toBe(35 * 60)
  })

  it('does nothing before the scheduled time', () => {
    expect(advanceScheduled({ startedAt: localSecs(23, 9, 30), now: localSecs(23, 9, 59) }).events).toEqual([])
  })

  it('finds a scheduled break after midnight', () => {
    const { events } = advanceScheduled({ startedAt: localSecs(23, 23, 30), now: localSecs(24, 2), scheduledTimes: [30] })
    expect(events[0].completedFocus.focusSecs).toBe(60 * 60)
  })

  it('takes whichever break came first when interval and schedule are both on', () => {
    const { events } = advanceScheduled({ startedAt: localSecs(23, 9, 30), now: localSecs(23, 11), useInterval: true })
    expect(events[0].completedFocus.focusSecs).toBe(INTERVAL_SECS)
  })
})

describe('firstScheduledBreakBetween', () => {
  it('ignores a scheduled time at or before the start', () => {
    expect(firstScheduledBreakBetween([600], localSecs(23, 10), localSecs(23, 11))).toBeNull()
  })

  it('returns the earliest time in range regardless of list order', () => {
    expect(firstScheduledBreakBetween([900, 630], localSecs(23, 10), localSecs(23, 16))).toBe(localSecs(23, 10, 30))
  })
})

describe('createFocusTomato', () => {
  const fixedRandom = () => 0.5

  it('builds a completed tomato sized by focus time', () => {
    const tomato = createFocusTomato({ id: 'focus-1', focusSecs: INTERVAL_SECS, trackStats: false, createdAt: 5, random: fixedRandom })
    expect(tomato).toEqual({ id: 'focus-1', face: 2, abandoned: false, pct: 2.5, colorPct: 1, rotation: 0, createdAt: 5 })
  })

  it('records focus seconds only when stats are tracked', () => {
    const tomato = createFocusTomato({ id: 'focus-1', focusSecs: INTERVAL_SECS, trackStats: true, createdAt: 5, random: fixedRandom })
    expect(tomato.focusSecs).toBe(INTERVAL_SECS)
  })
})
