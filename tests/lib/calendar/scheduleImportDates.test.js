import { describe, it, expect } from 'vitest'
import { scheduleImportOccurrence } from '../../../src/lib/calendar/scheduleImportDates.js'

const MONDAY = 0
const WEDNESDAY = 2
const FRIDAY = 4

describe('scheduleImportOccurrence', () => {
  it('repeats every week of the semester from its first week', () => {
    const plan = { mode: 'every', semesterStart: '2026-09-16', semesterEnd: '2027-01-29' }
    expect(scheduleImportOccurrence(MONDAY, plan)).toEqual({
      date: '2026-09-14',
      recurrence: { freq: 'weekly', interval: 1, until: '2027-01-29' },
    })
  })

  it('places a single week import without recurrence', () => {
    const plan = { mode: 'this', semesterStart: '2026-09-16' }
    expect(scheduleImportOccurrence(FRIDAY, plan)).toEqual({ date: '2026-09-18', recurrence: null })
  })

  it('starts a range import on the first matching weekday on or after the start date', () => {
    const plan = { mode: 'range', rangeStart: '2026-10-21', rangeEnd: '2026-11-20' }
    expect(scheduleImportOccurrence(MONDAY, plan)).toEqual({
      date: '2026-10-26',
      recurrence: { freq: 'weekly', interval: 1, until: '2026-11-20' },
    })
    expect(scheduleImportOccurrence(WEDNESDAY, plan).date).toBe('2026-10-21')
  })

  it('skips a class whose weekday never falls inside the range', () => {
    const plan = { mode: 'range', rangeStart: '2026-10-21', rangeEnd: '2026-10-23' }
    expect(scheduleImportOccurrence(MONDAY, plan)).toBeNull()
  })

  it('rejects a range that ends before it starts', () => {
    const plan = { mode: 'range', rangeStart: '2026-11-20', rangeEnd: '2026-10-21' }
    expect(scheduleImportOccurrence(FRIDAY, plan)).toBeNull()
  })
})
