import { describe, it, expect } from 'vitest'
import { resolveRowColors, matchClass } from '../../../src/lib/calendar/scheduleColors'

const CLASSES = [
  { id: 'c1', name: 'CD', color: '#f97316' },
  { id: 'c2', name: 'Redes', color: '#3b82f6' },
]

describe('matchClass', () => {
  it('matches on name regardless of case and accents', () => {
    expect(matchClass('cd', CLASSES)?.id).toBe('c1')
    expect(matchClass('REDES', CLASSES)?.id).toBe('c2')
  })

  it('returns null when nothing matches', () => {
    expect(matchClass('SIO', CLASSES)).toBeNull()
  })
})

describe('resolveRowColors', () => {
  it('prefers the matching class colour', () => {
    const [row] = resolveRowColors([{ title: 'CD', color: '#ffab00' }], CLASSES)
    expect(row.color).toBe('#f97316')
    expect(row.classId).toBe('c1')
  })

  it('falls back to the colour sampled from the image', () => {
    const [row] = resolveRowColors([{ title: 'SIO', color: '#ff8a65' }], CLASSES)
    expect(row.color).toBe('#ff8a65')
    expect(row.classId).toBeNull()
  })

  it('assigns a colour when neither is available', () => {
    const [row] = resolveRowColors([{ title: 'XYZ' }], CLASSES)
    expect(row.color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('keeps the same title consistent across rows', () => {
    const rows = resolveRowColors([
      { title: 'SIO', color: '#ff8a65' },
      { title: 'SIO', color: '#ff8a65' },
      { title: 'PEI' },
    ], CLASSES)
    expect(rows[0].color).toBe(rows[1].color)
    expect(rows[2].color).not.toBe(rows[0].color)
  })
})
