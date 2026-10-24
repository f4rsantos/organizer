import { describe, it, expect } from 'vitest'
import { normalizePaper, paperDash, paperDashOffset, paperSegments, paperTileImage } from '../../../src/lib/notes/paper.js'

describe('normalizePaper', () => {
  it('falls back to blank solid paper for unknown values', () => {
    expect(normalizePaper({ pattern: 'hexagons', style: 'wavy' })).toEqual({ pattern: 'none', style: 'solid' })
    expect(normalizePaper(null)).toEqual({ pattern: 'none', style: 'solid' })
  })

  it('keeps a valid pattern and style', () => {
    expect(normalizePaper({ pattern: 'grid', style: 'dotted' })).toEqual({ pattern: 'grid', style: 'dotted' })
  })
})

describe('paperDash', () => {
  it('repeats dashes a whole number of times per cell so tiles join seamlessly', () => {
    const spacing = 30
    for (const style of ['dashed', 'dotted']) {
      const period = paperDash(style, spacing).reduce((a, b) => a + b, 0)
      expect(spacing % period).toBe(0)
    }
  })

  it('centres a dash on every grid crossing so corners join', () => {
    expect(paperDashOffset('dashed', 24)).toBe(1.5)
    expect(paperDashOffset('solid', 24)).toBe(0)
  })

  it('draws dots as zero-length dashes', () => {
    expect(paperDash('dotted', 30)[0]).toBe(0)
    expect(paperDash('solid', 30)).toEqual([])
  })
})

describe('paperSegments', () => {
  it('rules lines on spacing multiples across the visible area', () => {
    const segments = paperSegments('lines', { minX: -10, minY: 25, maxX: 100, maxY: 100, spacing: 30 })
    expect(segments).toEqual([[-10, 30, 100, 30], [-10, 60, 100, 60], [-10, 90, 100, 90]])
  })

  it('keeps lines anchored to the world while scrolled into negative space', () => {
    const segments = paperSegments('lines', { minX: 0, minY: -70, maxX: 10, maxY: -20, spacing: 30 })
    expect(segments.map(s => s[1])).toEqual([-60, -30])
  })

  it('adds vertical lines for a grid', () => {
    const segments = paperSegments('grid', { minX: 0, minY: 0, maxX: 70, maxY: 40, spacing: 30 })
    expect(segments).toContainEqual([30, 0, 30, 40])
    expect(segments).toContainEqual([60, 0, 60, 40])
    expect(segments).toContainEqual([0, 30, 70, 30])
  })

  it('draws nothing on blank paper', () => {
    expect(paperSegments('none', { minX: 0, minY: 0, maxX: 100, maxY: 100, spacing: 30 })).toEqual([])
  })
})

describe('paperTileImage', () => {
  it('returns no image for blank paper', () => {
    expect(paperTileImage({ pattern: 'none', style: 'solid' })).toBeNull()
  })

  it('draws a scalable grid cell so it can follow each line height', () => {
    const svg = decodeURIComponent(paperTileImage({ pattern: 'grid', style: 'dashed' }))
    expect(svg).toContain('viewBox="0 0 24 24"')
    expect(svg).toContain('stroke-dasharray="3 3"')
    expect(svg).toContain('stroke-dashoffset="1.5"')
    expect(svg.match(/<line /g)).toHaveLength(2)
  })

  it('rules only the bottom edge for lined paper', () => {
    const svg = decodeURIComponent(paperTileImage({ pattern: 'lines', style: 'solid' }))
    expect(svg.match(/<line /g)).toHaveLength(1)
    expect(svg).not.toContain('stroke-dasharray')
  })
})
