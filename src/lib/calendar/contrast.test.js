import { describe, it, expect } from 'vitest'
import { readableTextColor, contrastRatio, relativeLuminance } from './contrast'

const PASTELS = ['#ffab00', '#90caf9', '#ffab91', '#e1bee7', '#ff8a65']

describe('readableTextColor', () => {
  it('lifts every pastel to at least AA contrast on white', () => {
    for (const hex of PASTELS) {
      const out = readableTextColor(hex, { background: '#ffffff' })
      expect(contrastRatio(out, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('leaves an already-readable colour alone', () => {
    const dark = '#1e3a8a'
    expect(readableTextColor(dark, { background: '#ffffff' })).toBe(dark)
  })

  it('lightens instead of darkening on a dark background', () => {
    const out = readableTextColor('#1e3a8a', { background: '#1a1a1a' })
    expect(relativeLuminance(out)).toBeGreaterThan(relativeLuminance('#1e3a8a'))
    expect(contrastRatio(out, '#1a1a1a')).toBeGreaterThanOrEqual(4.5)
  })

  it('passes through values it cannot parse', () => {
    expect(readableTextColor('not-a-color')).toBe('not-a-color')
    expect(readableTextColor(null)).toBe(null)
  })
})

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
  })

  it('is 1 for a colour against itself', () => {
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5)
  })
})
