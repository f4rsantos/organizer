import { describe, it, expect } from 'vitest'
import {
  normalizeStroke,
  strokeHit,
  eraseAt,
  eraseStrokesAt,
  shapePoints,
  appendPoint,
  buildStroke,
  boundsOfStrokes,
  strokesInLasso,
  translateStrokes,
} from '../../../src/lib/notes/canvasGeometry.js'

const line = (points, extra = {}) => ({ color: '#000', width: 2, points, ...extra })

describe('normalizeStroke', () => {
  it('reads legacy strokes saved as bare point arrays', () => {
    const stroke = normalizeStroke([[1, 2], [3, 4]])
    expect(stroke.points).toEqual([[1, 2], [3, 4]])
    expect(stroke.width).toBeGreaterThan(0)
  })
})

describe('strokeHit', () => {
  it('hits the middle of a long straight segment, not only its endpoints', () => {
    const stroke = line([[0, 0], [200, 0]])
    expect(strokeHit(stroke, 100, 3, 4)).toBe(true)
    expect(strokeHit(stroke, 100, 20, 4)).toBe(false)
  })
})

describe('eraseAt', () => {
  it('splits a freehand stroke where the eraser passes through it', () => {
    const strokes = [line([[0, 0], [100, 0]])]
    const next = eraseAt(strokes, 50, 0, 5)
    expect(next).toHaveLength(2)
    expect(Math.max(...next[0].points.map(p => p[0]))).toBeLessThan(50)
    expect(Math.min(...next[1].points.map(p => p[0]))).toBeGreaterThan(50)
  })

  it('removes a shape whole instead of leaving broken pieces', () => {
    const rect = line(shapePoints('rect', [0, 0], [100, 50]), { shape: 'rect' })
    expect(eraseAt([rect], 50, 0, 5)).toEqual([])
  })

  it('returns the same list when nothing is hit so no save is triggered', () => {
    const strokes = [line([[0, 0], [10, 0]])]
    expect(eraseAt(strokes, 300, 300, 5)).toBe(strokes)
  })

  it('drops a stroke fully covered by the eraser', () => {
    expect(eraseAt([line([[0, 0], [2, 0]])], 1, 0, 6)).toEqual([])
  })
})

describe('eraseStrokesAt', () => {
  it('removes every stroke the eraser touches in full', () => {
    const strokes = [line([[0, 0], [100, 0]]), line([[0, 50], [100, 50]])]
    expect(eraseStrokesAt(strokes, 50, 0, 5)).toEqual([strokes[1]])
  })

  it('returns the same list when nothing is hit so no save is triggered', () => {
    const strokes = [line([[0, 0], [10, 0]])]
    expect(eraseStrokesAt(strokes, 300, 300, 5)).toBe(strokes)
  })
})

describe('shapePoints', () => {
  it('closes a rectangle back on its first corner', () => {
    const points = shapePoints('rect', [10, 10], [50, 30])
    expect(points[0]).toEqual(points[points.length - 1])
    expect(points).toContainEqual([50, 30])
  })

  it('draws a straight line from start to end', () => {
    expect(shapePoints('line', [0, 0], [10, 5])).toEqual([[0, 0], [10, 5]])
  })

  it('keeps an ellipse inside its bounding box', () => {
    const points = shapePoints('ellipse', [0, 0], [100, 40])
    expect(points.every(([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 40)).toBe(true)
  })
})

describe('appendPoint', () => {
  it('skips jitter closer than the minimum distance', () => {
    const points = [[0, 0]]
    expect(appendPoint(points, [0.4, 0.3], 1)).toBe(points)
    expect(appendPoint(points, [3, 0], 1)).toEqual([[0, 0], [3, 0]])
  })
})

describe('buildStroke', () => {
  const style = { color: '#f00', width: 4 }

  it('keeps stylus pressure on pen strokes', () => {
    const stroke = buildStroke({ tool: 'pen', ...style, points: [[0, 0, 0.2], [5, 5, 0.9]] })
    expect(stroke.points[1][2]).toBe(0.9)
    expect(stroke.opacity).toBeUndefined()
  })

  it('draws the highlighter wide and translucent with even width', () => {
    const stroke = buildStroke({ tool: 'highlighter', ...style, points: [[0, 0, 0.2], [5, 5, 0.9]] }, { opacity: 0.35, widthScale: 4 })
    expect(stroke).toMatchObject({ width: 16, opacity: 0.35, points: [[0, 0], [5, 5]] })
  })


})

describe('boundsOfStrokes', () => {
  it('includes half the pen width around the ink', () => {
    expect(boundsOfStrokes([line([[10, 20], [30, 5]], { width: 4 })])).toEqual({ minX: 8, minY: 3, maxX: 32, maxY: 22 })
  })

  it('has no bounds for an empty drawing', () => {
    expect(boundsOfStrokes([])).toBeNull()
  })
})

describe('strokesInLasso', () => {
  const lasso = [[0, 0], [100, 0], [100, 100], [0, 100]]

  it('selects strokes drawn inside the loop and skips the ones outside', () => {
    const strokes = [line([[10, 10], [50, 50]]), line([[200, 200], [250, 250]]), line([[90, 50], [150, 50]])]
    expect([...strokesInLasso(strokes, lasso)]).toEqual([0])
  })

  it('selects nothing with a loop too small to enclose anything', () => {
    expect(strokesInLasso([line([[10, 10], [50, 50]])], [[0, 0], [1, 1]]).size).toBe(0)
  })
})

describe('translateStrokes', () => {
  it('moves only the selected strokes and keeps the others as they were', () => {
    const strokes = [line([[0, 0], [10, 0]]), line([[5, 5], [6, 6]])]
    const moved = translateStrokes(strokes, new Set([0]), 3, -2)
    expect(moved[0].points).toEqual([[3, -2], [13, -2]])
    expect(moved[1]).toBe(strokes[1])
  })

  it('keeps stylus pressure when moving', () => {
    const moved = translateStrokes([line([[0, 0, 0.4]])], new Set([0]), 1, 1)
    expect(moved[0].points[0]).toEqual([1, 1, 0.4])
  })
})
