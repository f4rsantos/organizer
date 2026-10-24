import { describe, it, expect } from 'vitest'
import { screenToWorld, worldToScreen, zoomAround, panBy, fitViewport, visibleWorldRect } from '../../../src/lib/notes/canvasViewport.js'

const view = { x: 100, y: 50, zoom: 2 }

describe('canvas viewport', () => {
  it('maps screen and world points both ways', () => {
    const world = screenToWorld(view, [40, 20])
    expect(world).toEqual([120, 60])
    expect(worldToScreen(view, world)).toEqual([40, 20])
  })

  it('keeps the point under the cursor fixed while zooming', () => {
    const anchor = [300, 200]
    const before = screenToWorld(view, anchor)
    const zoomed = zoomAround(view, 1.5, anchor)
    expect(zoomed.zoom).toBe(3)
    const after = screenToWorld(zoomed, anchor)
    expect(after[0]).toBeCloseTo(before[0])
    expect(after[1]).toBeCloseTo(before[1])
  })

  it('stops zooming at the limits', () => {
    expect(zoomAround({ x: 0, y: 0, zoom: 1 }, 100, [0, 0]).zoom).toBe(8)
    expect(zoomAround({ x: 0, y: 0, zoom: 1 }, 0.001, [0, 0]).zoom).toBe(0.1)
  })

  it('pans by screen pixels regardless of zoom', () => {
    expect(panBy(view, 20, -10)).toEqual({ x: 90, y: 55, zoom: 2 })
  })

  it('fits a drawing into the screen with a margin, never zooming past 100%', () => {
    const fitted = fitViewport({ minX: 0, minY: 0, maxX: 1000, maxY: 500 }, { width: 500, height: 500 }, 20)
    expect(fitted.zoom).toBeCloseTo(460 / 1000)
    const small = fitViewport({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, { width: 500, height: 500 }, 20)
    expect(small.zoom).toBe(1)
  })

  it('reports which part of the world is on screen', () => {
    expect(visibleWorldRect(view, { width: 200, height: 100 })).toEqual({ minX: 100, minY: 50, maxX: 200, maxY: 100 })
  })
})
