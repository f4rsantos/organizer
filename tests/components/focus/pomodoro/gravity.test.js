import { describe, it, expect } from 'vitest'
import { smoothGravity } from '../../../../src/components/focus/pomodoro/gravity.js'

describe('smoothGravity', () => {
  it('moves only part of the way toward a new reading', () => {
    expect(smoothGravity({ x: 0, y: 1 }, { x: 1, y: 0 }, 0.2)).toEqual({ x: 0.2, y: 0.8 })
  })

  it('damps sensor noise around a steady reading', () => {
    let gravity = { x: 0, y: 1 }
    let worst = 0
    for (let i = 0; i < 200; i++) {
      gravity = smoothGravity(gravity, { x: (i % 2 ? 1 : -1) * 0.02, y: 1 })
      worst = Math.max(worst, Math.abs(gravity.x))
    }
    expect(worst).toBeLessThan(0.01)
  })
})
