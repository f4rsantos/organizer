import { describe, expect, it } from 'vitest'
import { clampWidgetPosition, isFocusSessionActive } from '@/lib/focus/floatingWidget'

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
