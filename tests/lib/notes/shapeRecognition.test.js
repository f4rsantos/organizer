import { describe, it, expect } from 'vitest'
import { recognizeShape } from '../../../src/lib/notes/shapeRecognition.js'

function seededNoise(seed) {
  let state = seed
  return amount => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return (state / 4294967296 - 0.5) * 2 * amount
  }
}

function wobble(points, amount, seed = 7) {
  const noise = seededNoise(seed)
  return points.map(([x, y]) => [x + noise(amount), y + noise(amount)])
}

function along(from, to, steps) {
  return Array.from({ length: steps }, (_, i) => [
    from[0] + ((to[0] - from[0]) * i) / steps,
    from[1] + ((to[1] - from[1]) * i) / steps,
  ])
}

function polygon(corners, stepsPerEdge = 20) {
  const points = corners.flatMap((corner, i) => along(corner, corners[(i + 1) % corners.length], stepsPerEdge))
  return [...points, corners[0]]
}

function regular(sides, cx, cy, radius) {
  return Array.from({ length: sides }, (_, i) => {
    const angle = -Math.PI / 2 + (i / sides) * Math.PI * 2
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]
  })
}

function ellipse(cx, cy, rx, ry, steps = 60) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = (i / steps) * Math.PI * 2
    return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]
  })
}

describe('recognizeShape', () => {
  it('straightens a shaky line', () => {
    const shape = recognizeShape(wobble(along([0, 0], [200, 40], 40).concat([[200, 40]]), 2))
    expect(shape.shape).toBe('line')
    expect(shape.points).toHaveLength(2)
  })

  it('squares off a hand drawn rectangle', () => {
    const shape = recognizeShape(wobble(polygon([[0, 0], [160, 0], [160, 90], [0, 90]]), 3))
    expect(shape.shape).toBe('rect')
    expect(shape.points).toHaveLength(5)
    expect(shape.points[0]).toEqual(shape.points[4])
  })

  it('cleans up a hand drawn triangle', () => {
    const shape = recognizeShape(wobble(polygon([[50, 0], [100, 90], [0, 90]]), 2))
    expect(shape.shape).toBe('polygon')
    expect(shape.points).toHaveLength(4)
  })

  it('cleans up a hand drawn pentagon', () => {
    const shape = recognizeShape(wobble(polygon(regular(5, 100, 100, 80)), 2))
    expect(shape.shape).toBe('polygon')
    expect(shape.points).toHaveLength(6)
  })

  it('cleans up a hand drawn hexagon instead of rounding it', () => {
    const shape = recognizeShape(wobble(polygon(regular(6, 100, 100, 80)), 2))
    expect(shape.shape).toBe('polygon')
    expect(shape.points).toHaveLength(7)
  })

  it('rounds a perfect circle drawn slowly with many points', () => {
    expect(recognizeShape(wobble(ellipse(100, 100, 70, 70, 120), 1.5)).shape).toBe('ellipse')
  })

  it('rounds a wobbly circle into an ellipse', () => {
    const shape = recognizeShape(wobble(ellipse(100, 100, 80, 50), 3))
    expect(shape.shape).toBe('ellipse')
  })

  it('leaves handwriting alone', () => {
    const scribble = [[0, 0], [10, 30], [20, 0], [30, 30], [40, 0], [50, 30], [60, 0], [45, 15], [5, 25]]
    expect(recognizeShape(scribble)).toBeNull()
  })

  it('leaves a short tick alone', () => {
    expect(recognizeShape([[0, 0], [3, 2], [6, 1]])).toBeNull()
  })
})
