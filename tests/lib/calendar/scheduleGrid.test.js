import { describe, it, expect } from 'vitest'
import { buildRowsFromLines, findDayColumns, findTimeScale } from '../../../src/lib/calendar/scheduleGrid'

function word(text, x0, y0, x1, y1) {
  return { text, x0, y0, x1, y1 }
}

function textBlock(text, x0, y0, x1, y1) {
  const parts = text.split(' ')
  const span = (x1 - x0) / parts.length
  return parts.map((p, i) => word(p, x0 + span * i, y0, x0 + span * (i + 1), y1))
}

const HEADERS = [
  word('MON', 200, 57, 251, 74),
  word('TUE', 441, 57, 483, 74),
  word('WED', 674, 57, 723, 74),
  word('THU', 912, 57, 957, 74),
  word('FRI', 1156, 57, 1187, 74),
]

const GUTTER = Array.from({ length: 13 }, (_, i) =>
  word(`${String(8 + i).padStart(2, '0')}:00`, 42, 86 + i * 52.5, 86, 99 + i * 52.5))

describe('findDayColumns', () => {
  it('finds day headers in left-to-right order', () => {
    const cols = findDayColumns([...HEADERS, ...GUTTER])
    expect(cols.map(c => c.dayIndex)).toEqual([0, 1, 2, 3, 4])
  })

  it('gives each column a boundary that splits neighbours', () => {
    const cols = findDayColumns([...HEADERS, ...GUTTER])
    expect(cols[0].right).toBeLessThan(cols[1].centre)
    expect(cols[1].left).toBeGreaterThan(cols[0].centre)
  })

  it('returns empty when no day names are present', () => {
    expect(findDayColumns(GUTTER)).toEqual([])
  })
})

describe('findTimeScale', () => {
  it('derives minutes-per-pixel from the gutter', () => {
    const scale = findTimeScale([...HEADERS, ...GUTTER])
    expect(scale).not.toBeNull()
    expect(scale.minutesPerPixel).toBeCloseTo(60 / 52.5, 1)
  })

  it('returns null with fewer than two gutter marks', () => {
    expect(findTimeScale([...HEADERS, GUTTER[0]])).toBeNull()
  })
})

describe('buildRowsFromLines', () => {
  it('keeps same-row boxes in different columns separate', () => {
    const boxes = [
      ...textBlock('IA - 40846', 175, 437, 277, 454),
      ...textBlock('TQS - 45426', 400, 437, 524, 454),
    ]
    const { rows } = buildRowsFromLines([...HEADERS, ...GUTTER, ...boxes])
    expect(rows).toHaveLength(2)
    expect(rows.map(r => r.dayIndex)).toEqual([0, 1])
    expect(rows[0].title).toBe('IA')
    expect(rows[1].title).toBe('TQS')
  })

  it('treats a close second line as the note, not a new event', () => {
    const box = [
      ...textBlock('CD - 40382', 643, 174, 754, 191),
      ...textBlock('P1-04.2.11', 659, 213, 737, 224),
    ]
    const { rows } = buildRowsFromLines([...HEADERS, ...GUTTER, ...box])
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('CD')
    expect(rows[0].note).toContain('04.2.11')
  })

  it('reports why it failed when there are no day headers', () => {
    const { rows, reason } = buildRowsFromLines(GUTTER)
    expect(rows).toHaveLength(0)
    expect(reason).toBe('no-days')
  })

  it('reports why it failed when there is no time gutter', () => {
    const { rows, reason } = buildRowsFromLines(HEADERS)
    expect(rows).toHaveLength(0)
    expect(reason).toBe('no-times')
  })
})
