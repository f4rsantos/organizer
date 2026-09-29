import { describe, expect, it } from 'vitest'
import { clampWidgetPosition, focusWheelProgress, isFocusSessionActive } from '@/lib/focus/floatingWidget'

describe('clampWidgetPosition', () => {
  it('keeps a fully in-bounds position unchanged', () => {
    expect(clampWidgetPosition({ x: 100, y: 100, width: 200, height: 80, viewportWidth: 1000, viewportHeight: 800 }))
      .toEqual({ x: 100, y: 100 })
  })

  it('clamps negative coordinates to the margin', () => {
    expect(clampWidgetPosition({ x: -50, y: -50, width: 200, height: 80, viewportWidth: 1000, viewportHeight: 800 }))
      .toEqual({ x: 8, y: 8 })
  })

  it('clamps coordinates past the far edge', () => {
    expect(clampWidgetPosition({ x: 5000, y: 5000, width: 200, height: 80, viewportWidth: 1000, viewportHeight: 800 }))
      .toEqual({ x: 792, y: 712 })
  })

  it('falls back to the margin when the widget is larger than the viewport', () => {
    expect(clampWidgetPosition({ x: 10, y: 10, width: 2000, height: 2000, viewportWidth: 500, viewportHeight: 400 }))
      .toEqual({ x: 8, y: 8 })
  })
})

describe('isFocusSessionActive', () => {
  it('is false when idle at the initial state', () => {
    expect(isFocusSessionActive({
      status: 'paused', phase: 'focus', startedAt: null,
      totalElapsedBase: 0, cycleElapsedBase: 0, breakSecsLeftBase: 0,
    })).toBe(false)
  })

  it('is true while running', () => {
    expect(isFocusSessionActive({ status: 'started', phase: 'focus', startedAt: 123 })).toBe(true)
  })

  it('is true when paused mid-cycle', () => {
    expect(isFocusSessionActive({ status: 'paused', phase: 'focus', cycleElapsedBase: 30 })).toBe(true)
  })

  it('is true when paused during an unfinished break', () => {
    expect(isFocusSessionActive({ status: 'paused', phase: 'break', breakSecsLeftBase: 20 })).toBe(true)
  })

  it('is false when paused after a break has fully elapsed and nothing else is pending', () => {
    expect(isFocusSessionActive({ status: 'paused', phase: 'break', breakSecsLeftBase: 0, startedAt: null })).toBe(false)
  })

  it('is false for null focusSync', () => {
    expect(isFocusSessionActive(null)).toBe(false)
  })
})

describe('focusWheelProgress', () => {
  const intervalFocus = { useInterval: true, intervalMins: 25, intervalBreakMins: 5, scheduledBreakMins: 10 }
  const scheduledFocus = { useInterval: false, intervalMins: 25, intervalBreakMins: 5, scheduledBreakMins: 10 }

  it('uses cycle elapsed over the interval length in interval mode', () => {
    expect(focusWheelProgress({ focus: intervalFocus, phase: 'focus', cycleElapsed: 750, breakSecsLeft: 0, scheduledPct: 0.9 }))
      .toBe(0.5)
  })

  it('uses the scheduled percentage when not in interval mode', () => {
    expect(focusWheelProgress({ focus: scheduledFocus, phase: 'focus', cycleElapsed: 750, breakSecsLeft: 0, scheduledPct: 0.3 }))
      .toBe(0.3)
  })

  it('fills up as the interval break counts down', () => {
    expect(focusWheelProgress({ focus: intervalFocus, phase: 'break', cycleElapsed: 0, breakSecsLeft: 60, scheduledPct: 0 }))
      .toBeCloseTo(0.8)
  })

  it('uses the scheduled break length outside interval mode', () => {
    expect(focusWheelProgress({ focus: scheduledFocus, phase: 'break', cycleElapsed: 0, breakSecsLeft: 300, scheduledPct: 0 }))
      .toBe(0.5)
  })

  it('clamps overshoot to a full wheel', () => {
    expect(focusWheelProgress({ focus: intervalFocus, phase: 'focus', cycleElapsed: 99999, breakSecsLeft: 0, scheduledPct: 0 }))
      .toBe(1)
  })

  it('returns zero for non-finite scheduled progress', () => {
    expect(focusWheelProgress({ focus: scheduledFocus, phase: 'focus', cycleElapsed: 0, breakSecsLeft: 0, scheduledPct: NaN }))
      .toBe(0)
  })

  it('returns zero when the interval length is zero', () => {
    expect(focusWheelProgress({ focus: { useInterval: true, intervalMins: 0 }, phase: 'focus', cycleElapsed: 10, breakSecsLeft: 0, scheduledPct: 0 }))
      .toBe(0)
  })
})
