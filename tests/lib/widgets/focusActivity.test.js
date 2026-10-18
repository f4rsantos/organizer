import { describe, it, expect } from 'vitest'
import { buildFocusActivity, buildFocusTemplate } from '../../../src/lib/widgets/focusActivity.js'

const LABELS = { focusPhase: 'Focus', breakPhase: 'Break' }
const STARTED_AT = 1_800_000_000
const INTERVAL = { useInterval: true, intervalMins: 25, intervalBreakMins: 5 }

describe('focus live activity', () => {
  it('has no activity when nothing has been focused yet', () => {
    expect(buildFocusActivity({ status: 'paused', startedAt: null, cycleElapsedBase: 0, updatedAt: 5 }, INTERVAL, LABELS)).toBeNull()
  })

  it('keeps a paused focus session on screen, frozen at the time it was paused', () => {
    const pausedAtMs = STARTED_AT * 1000
    const activity = buildFocusActivity({ status: 'paused', phase: 'focus', startedAt: null, cycleElapsedBase: 600, updatedAt: pausedAtMs }, INTERVAL, LABELS)
    expect(activity).toEqual({
      phase: 'focus',
      title: 'Focus',
      pausedAtMs,
      countFromMs: pausedAtMs - 600_000,
      endsAtMs: pausedAtMs + 900_000,
    })
  })

  it('keeps a paused break on screen with the break time that was left', () => {
    const pausedAtMs = STARTED_AT * 1000
    const activity = buildFocusActivity({ status: 'paused', phase: 'break', startedAt: null, breakSecsLeftBase: 120, updatedAt: pausedAtMs }, INTERVAL, LABELS)
    expect(activity).toMatchObject({ phase: 'break', pausedAtMs, endsAtMs: pausedAtMs + 120_000 })
  })

  it('counts a resumed interval down to the moment the break starts', () => {
    const activity = buildFocusActivity({ status: 'started', phase: 'focus', startedAt: STARTED_AT, cycleElapsedBase: 300 }, INTERVAL, LABELS)
    expect(activity).toEqual({
      phase: 'focus',
      title: 'Focus',
      countFromMs: (STARTED_AT - 300) * 1000,
      endsAtMs: (STARTED_AT + 1200) * 1000,
      pausedAtMs: null,
    })
  })

  it('counts a break down to the moment focus resumes, with the custom break label', () => {
    const activity = buildFocusActivity(
      { status: 'started', phase: 'break', startedAt: STARTED_AT, cycleElapsedBase: 1500, breakSecsLeftBase: 240 },
      { ...INTERVAL, breakLabel: 'Stretch' },
      LABELS,
    )
    expect(activity).toMatchObject({ phase: 'break', title: 'Stretch', countFromMs: STARTED_AT * 1000, endsAtMs: (STARTED_AT + 240) * 1000 })
  })

  it('counts up with no end when focus has no interval or timer', () => {
    const activity = buildFocusActivity({ status: 'started', phase: 'focus', startedAt: STARTED_AT, cycleElapsedBase: 60 }, { useInterval: false }, LABELS)
    expect(activity).toMatchObject({ countFromMs: (STARTED_AT - 60) * 1000, endsAtMs: null })
  })
})

describe('focus template for starting from Control Center', () => {
  it('starts with the configured interval and focus label', () => {
    expect(buildFocusTemplate({ ...INTERVAL, focusLabel: 'Deep work' }, LABELS)).toEqual({ title: 'Deep work', targetSecs: 1500 })
  })

  it('starts an open-ended session when neither interval nor timer is on', () => {
    expect(buildFocusTemplate({ useInterval: false }, LABELS)).toEqual({ title: 'Focus', targetSecs: null })
  })
})
