import { describe, it, expect, vi, afterEach } from 'vitest'
import { scheduleWake } from '../../../src/lib/focus/wakeTimer.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('scheduleWake without worker support', () => {
  it('fires at the requested time', () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    scheduleWake(Date.now() + 1000, callback)
    vi.advanceTimersByTime(999)
    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('fires right away for a time already past', () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    scheduleWake(Date.now() - 5000, callback)
    vi.advanceTimersByTime(0)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('can be cancelled', () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const cancel = scheduleWake(Date.now() + 1000, callback)
    cancel()
    vi.advanceTimersByTime(2000)
    expect(callback).not.toHaveBeenCalled()
  })
})
