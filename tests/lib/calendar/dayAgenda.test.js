import { describe, it, expect } from 'vitest'
import { dayTimeRange, sortDayAgenda } from '../../../src/lib/calendar/dayAgenda.js'

const day = (y, m, d) => new Date(y, m - 1, d)

function event(id, start, end, startTime = null, endTime = null) {
  return { id, startTime, endTime, _range: { start, end } }
}

describe('time range shown for an event on a given day', () => {
  it('shows start and end for a timed single-day event', () => {
    const e = event('a', day(2026, 10, 5), day(2026, 10, 5), '09:00', '10:30')
    expect(dayTimeRange(e, day(2026, 10, 5))).toEqual({ start: '09:00', end: '10:30' })
  })

  it('shows only the start when the event has no end time', () => {
    const e = event('a', day(2026, 10, 5), day(2026, 10, 5), '14:00')
    expect(dayTimeRange(e, day(2026, 10, 5))).toEqual({ start: '14:00', end: null })
  })

  it('marks an all-day event as having no time', () => {
    const e = event('a', day(2026, 10, 5), day(2026, 10, 5))
    expect(dayTimeRange(e, day(2026, 10, 5))).toBe(null)
  })

  it('shows only the start on the first day of a multi-day timed event', () => {
    const e = event('a', day(2026, 10, 5), day(2026, 10, 7), '18:00', '11:00')
    expect(dayTimeRange(e, day(2026, 10, 5))).toEqual({ start: '18:00', end: null, continues: 'after' })
  })

  it('shows only the end on the last day of a multi-day timed event', () => {
    const e = event('a', day(2026, 10, 5), day(2026, 10, 7), '18:00', '11:00')
    expect(dayTimeRange(e, day(2026, 10, 7))).toEqual({ start: null, end: '11:00', continues: 'before' })
  })

  it('treats a middle day of a multi-day timed event as all day', () => {
    const e = event('a', day(2026, 10, 5), day(2026, 10, 7), '18:00', '11:00')
    expect(dayTimeRange(e, day(2026, 10, 6))).toBe(null)
  })
})

describe('day agenda order', () => {
  it('puts all-day events first, then timed events by start time', () => {
    const d = day(2026, 10, 5)
    const events = [
      event('late', d, d, '16:00'),
      event('allDay', d, d),
      event('early', d, d, '08:15', '09:00'),
    ]
    expect(sortDayAgenda(events, d).map(e => e.id)).toEqual(['allDay', 'early', 'late'])
  })

  it('places an event continuing from yesterday before events starting today', () => {
    const d = day(2026, 10, 6)
    const events = [
      event('morning', d, d, '07:00'),
      event('overnight', day(2026, 10, 5), d, '22:00', '06:00'),
    ]
    expect(sortDayAgenda(events, d).map(e => e.id)).toEqual(['overnight', 'morning'])
  })
})
