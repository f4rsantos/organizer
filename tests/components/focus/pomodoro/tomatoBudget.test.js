import { describe, it, expect } from 'vitest'
import { fitTomatoesToArea } from '../../../../src/components/focus/pomodoro/tomatoBudget.js'

const tomatoes = count => Array.from({ length: count }, (_, i) => ({ id: i, size: 40 }))
const sizeOf = t => t.size

describe('fitTomatoesToArea', () => {
  it('keeps every tomato while they fit on screen', () => {
    const list = tomatoes(5)
    expect(fitTomatoesToArea(list, { width: 400, height: 600, sizeOf })).toBe(list)
  })

  it('keeps the newest tomatoes when the pile would overflow the screen', () => {
    const fitted = fitTomatoesToArea(tomatoes(600), { width: 400, height: 600, sizeOf })
    expect(fitted.length).toBeLessThan(600)
    expect(fitted[fitted.length - 1].id).toBe(599)
    const area = fitted.reduce((sum, t) => sum + Math.PI * (t.size / 2) ** 2, 0)
    expect(area).toBeLessThanOrEqual(400 * 600)
  })

  it('never simulates more than the hard cap on a huge screen', () => {
    expect(fitTomatoesToArea(tomatoes(600), { width: 10000, height: 10000, sizeOf, max: 200 })).toHaveLength(200)
  })
})
