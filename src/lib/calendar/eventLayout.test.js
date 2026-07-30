import { describe, it, expect } from 'vitest'
import {
  timeToMinutes, minutesToTime, segmentForDay, segmentsForDay, assignColumns, layoutDayEvents,
} from './eventLayout.js'

const day = (y, m, d) => new Date(y, m - 1, d)

function event(id, startDate, endDate, startTime, endTime) {
  return {
    id,
    startTime,
    endTime,
    _range: { start: startDate, end: endDate },
  }
}

describe('time helpers', () => {
  it('converts a time to minutes', () => {
    expect(timeToMinutes('09:30')).toBe(570)
  })

  it('returns null for a non-string time', () => {
    expect(timeToMinutes(null)).toBe(null)
  })

  it('returns null for a malformed time', () => {
    expect(timeToMinutes('lunch')).toBe(null)
  })

  it('converts minutes back to a time', () => {
    expect(minutesToTime(570)).toBe('09:30')
  })

  it('pads single digit values', () => {
    expect(minutesToTime(65)).toBe('01:05')
  })

  it('clamps beyond the end of the day', () => {
    expect(minutesToTime(2000)).toBe('24:00')
  })
})

describe('single day segments', () => {
  const target = day(2026, 3, 10)

  it('uses the explicit end time', () => {
    const e = event('a', target, target, '09:00', '10:30')
    expect(segmentForDay(e, target)).toMatchObject({ startMinutes: 540, endMinutes: 630 })
  })

  it('defaults to a one hour block when the end time is missing', () => {
    const e = event('a', target, target, '09:00', null)
    expect(segmentForDay(e, target).endMinutes).toBe(600)
  })

  it('defaults to one hour when the end time precedes the start', () => {
    const e = event('a', target, target, '09:00', '08:00')
    expect(segmentForDay(e, target).endMinutes).toBe(600)
  })

  it('never runs past midnight', () => {
    const e = event('a', target, target, '23:30', null)
    expect(segmentForDay(e, target).endMinutes).toBe(1440)
  })

  it('ignores an all-day event', () => {
    expect(segmentForDay({ _range: { start: target, end: target } }, target)).toBe(null)
  })

  it('ignores a day outside the range', () => {
    const e = event('a', target, target, '09:00', '10:00')
    expect(segmentForDay(e, day(2026, 3, 11))).toBe(null)
  })
})

describe('multi day segments', () => {
  const start = day(2026, 3, 9)
  const middle = day(2026, 3, 10)
  const end = day(2026, 3, 11)
  const spanning = event('m', start, end, '14:00', '10:00')

  it('runs from the start time to midnight on the first day', () => {
    expect(segmentForDay(spanning, start)).toMatchObject({
      startMinutes: 840, endMinutes: 1440, continuesBefore: false, continuesAfter: true,
    })
  })

  it('fills the whole middle day', () => {
    expect(segmentForDay(spanning, middle)).toMatchObject({
      startMinutes: 0, endMinutes: 1440, continuesBefore: true, continuesAfter: true,
    })
  })

  it('runs from midnight to the end time on the last day', () => {
    expect(segmentForDay(spanning, end)).toMatchObject({
      startMinutes: 0, endMinutes: 600, continuesBefore: true, continuesAfter: false,
    })
  })

  it('covers every day across a longer span', () => {
    const long = event('l', day(2026, 3, 1), day(2026, 3, 5), '08:00', '09:00')
    const covered = [1, 2, 3, 4, 5].filter(d => segmentForDay(long, day(2026, 3, d)))
    expect(covered).toEqual([1, 2, 3, 4, 5])
  })

  it('excludes the day after the range ends', () => {
    expect(segmentForDay(spanning, day(2026, 3, 12))).toBe(null)
  })

  it('spans a month boundary', () => {
    const crossing = event('c', day(2026, 3, 31), day(2026, 4, 1), '22:00', '02:00')
    expect(segmentForDay(crossing, day(2026, 4, 1))).toMatchObject({ startMinutes: 0, endMinutes: 120 })
  })

  it('spans a DST transition without losing a day', () => {
    const dst = event('d', day(2026, 3, 28), day(2026, 3, 30), '23:00', '01:00')
    const covered = [28, 29, 30].filter(d => segmentForDay(dst, day(2026, 3, d)))
    expect(covered).toEqual([28, 29, 30])
  })
})

describe('overlap columns', () => {
  const target = day(2026, 3, 10)
  const layout = events => layoutDayEvents(events, target)

  it('gives a lone event the full width', () => {
    const [only] = layout([event('a', target, target, '09:00', '10:00')])
    expect([only.column, only.columnCount]).toEqual([0, 1])
  })

  it('splits two overlapping events into two columns', () => {
    const result = layout([
      event('a', target, target, '09:00', '11:00'),
      event('b', target, target, '10:00', '12:00'),
    ])
    expect(result.map(r => [r.column, r.columnCount])).toEqual([[0, 2], [1, 2]])
  })

  it('splits three concurrent events into three columns', () => {
    const result = layout([
      event('a', target, target, '09:00', '12:00'),
      event('b', target, target, '09:30', '12:00'),
      event('c', target, target, '10:00', '12:00'),
    ])
    expect(result.map(r => r.column)).toEqual([0, 1, 2])
    expect(result.every(r => r.columnCount === 3)).toBe(true)
  })

  it('keeps adjacent but non-overlapping events full width', () => {
    const result = layout([
      event('a', target, target, '09:00', '10:00'),
      event('b', target, target, '10:00', '11:00'),
    ])
    expect(result.every(r => r.columnCount === 1)).toBe(true)
  })

  it('reuses a freed column after an event ends', () => {
    const result = layout([
      event('a', target, target, '09:00', '12:00'),
      event('b', target, target, '09:30', '10:00'),
      event('c', target, target, '10:30', '11:00'),
    ])
    expect(result.map(r => r.column)).toEqual([0, 1, 1])
  })

  it('separates two independent clusters', () => {
    const result = layout([
      event('a', target, target, '09:00', '10:00'),
      event('b', target, target, '09:30', '10:00'),
      event('c', target, target, '14:00', '15:00'),
    ])
    expect(result.map(r => r.columnCount)).toEqual([2, 2, 1])
  })

  it('returns nothing when there are no timed events', () => {
    expect(layout([{ _range: { start: target, end: target } }])).toEqual([])
  })
})

describe('segmentsForDay ordering', () => {
  const target = day(2026, 3, 10)

  it('sorts by start time', () => {
    const result = segmentsForDay([
      event('late', target, target, '15:00', '16:00'),
      event('early', target, target, '09:00', '10:00'),
    ], target)
    expect(result.map(r => r.event.id)).toEqual(['early', 'late'])
  })

  it('puts the longer event first when starts match', () => {
    const result = segmentsForDay([
      event('short', target, target, '09:00', '10:00'),
      event('long', target, target, '09:00', '12:00'),
    ], target)
    expect(result.map(r => r.event.id)).toEqual(['long', 'short'])
  })
})

describe('assignColumns is pure', () => {
  it('does not mutate the input segments', () => {
    const segments = [{ startMinutes: 0, endMinutes: 60 }]
    assignColumns(segments)
    expect(segments[0]).toEqual({ startMinutes: 0, endMinutes: 60 })
  })
})
