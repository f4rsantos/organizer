import { describe, it, expect } from 'vitest'
import {
  completionRate,
  currentPeriodKey,
  habitCompletion,
  habitPeriods,
  habitStreak,
  groupPeriodsForCalendar,
  isPending,
  isRescue,
  normalizeWeekdays,
  periodKeyFor,
  periodsBetween,
} from './habits.js'

function makeHabit(overrides = {}) {
  return {
    id: 'g1',
    title: 'Read',
    cadenceDays: 1,
    requireNote: false,
    color: null,
    createdAt: new Date('2026-01-05T08:00:00').getTime(),
    checkIns: {},
    ...overrides,
  }
}

describe('periodKeyFor', () => {
  const anchor = new Date('2026-01-05T00:00:00')

  it('uses the day itself for daily habits', () => {
    expect(periodKeyFor(new Date('2026-01-07T22:00:00'), 1, anchor)).toBe('2026-01-07')
  })

  it('snaps weekly habits to Monday', () => {
    expect(periodKeyFor(new Date('2026-01-11T12:00:00'), 7, anchor)).toBe('2026-01-05')
    expect(periodKeyFor(new Date('2026-01-12T00:30:00'), 7, anchor)).toBe('2026-01-12')
  })

  it('snaps monthly habits to the first of the month', () => {
    expect(periodKeyFor(new Date('2026-03-22T12:00:00'), 30, anchor)).toBe('2026-03-01')
  })

  it('steps every N days from the anchor for custom cadences', () => {
    expect(periodKeyFor(new Date('2026-01-05T10:00:00'), 3, anchor)).toBe('2026-01-05')
    expect(periodKeyFor(new Date('2026-01-07T10:00:00'), 3, anchor)).toBe('2026-01-05')
    expect(periodKeyFor(new Date('2026-01-08T10:00:00'), 3, anchor)).toBe('2026-01-08')
  })
})

describe('periodsBetween', () => {
  it('produces one period per day for a daily habit', () => {
    const habit = makeHabit()
    const periods = periodsBetween(habit, new Date('2026-01-05'), new Date('2026-01-08'))
    expect(periods.map(p => p.key)).toEqual(['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08'])
  })

  it('walks month starts for a monthly habit', () => {
    const habit = makeHabit({ cadenceDays: 30 })
    const periods = periodsBetween(habit, new Date('2026-01-05'), new Date('2026-03-10'))
    expect(periods.map(p => p.key)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])
  })
})

describe('habitStreak', () => {
  it('counts the current run backwards from the latest period', () => {
    const habit = makeHabit({
      checkIns: {
        '2026-01-05': { at: 1, note: '' },
        '2026-01-06': { at: 1, note: '' },
        '2026-01-07': { at: 1, note: '' },
      },
    })
    const streak = habitStreak(habit, new Date('2026-01-07T12:00:00'))
    expect(streak).toMatchObject({ current: 3, best: 3, total: 3 })
  })

  it('breaks the current streak on a missed period but keeps the best', () => {
    const habit = makeHabit({
      checkIns: {
        '2026-01-05': { at: 1, note: '' },
        '2026-01-06': { at: 1, note: '' },
        '2026-01-08': { at: 1, note: '' },
      },
    })
    const streak = habitStreak(habit, new Date('2026-01-08T12:00:00'))
    expect(streak.current).toBe(1)
    expect(streak.best).toBe(2)
    expect(streak.total).toBe(3)
  })

  it('does not break the streak just because today is still unclicked', () => {
    const habit = makeHabit({
      checkIns: {
        '2026-01-05': { at: 1, note: '' },
        '2026-01-06': { at: 1, note: '' },
      },
    })
    const streak = habitStreak(habit, new Date('2026-01-07T09:00:00'))
    expect(streak.current).toBe(2)
  })
})

describe('habitPeriods', () => {
  it('marks the last period as current and reports pending state', () => {
    const habit = makeHabit()
    const periods = habitPeriods(habit, new Date('2026-01-07T12:00:00'))
    expect(periods.at(-1)).toMatchObject({ key: '2026-01-07', current: true, done: false })
    expect(isPending(habit, new Date('2026-01-07T12:00:00'))).toBe(true)
  })

  it('shows a single centered period on the first day', () => {
    const habit = makeHabit()
    const periods = habitPeriods(habit, new Date('2026-01-05T09:00:00'))
    expect(periods).toHaveLength(1)
    expect(periods[0]).toMatchObject({ key: '2026-01-05', current: true })
  })

  it('carries the note through', () => {
    const habit = makeHabit({ checkIns: { '2026-01-05': { at: 1, note: 'done it' } } })
    const periods = habitPeriods(habit, new Date('2026-01-05T12:00:00'))
    expect(periods[0].note).toBe('done it')
  })
})

describe('groupPeriodsForCalendar', () => {
  it('starts a new row on Monday and a new block on a new month, padding to 7 cells', () => {
    const habit = makeHabit()
    const periods = habitPeriods(habit, new Date('2026-02-03T12:00:00'))
    const months = groupPeriodsForCalendar(periods)

    expect(months.map(m => m.key)).toEqual(['2026-01', '2026-02'])

    const january = months[0]
    expect(january.rows[0].cells).toHaveLength(7)
    expect(january.rows[0].cells.map(c => c?.key ?? null)).toEqual([
      '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09', '2026-01-10', '2026-01-11',
    ])
    expect(january.rows[1].cells[0].key).toBe('2026-01-12')
  })

  it('pads a single early period to a full 7-cell row with fillers', () => {
    const habit = makeHabit()
    const months = groupPeriodsForCalendar(habitPeriods(habit, new Date('2026-01-05T12:00:00')))
    expect(months).toHaveLength(1)
    expect(months[0].rows).toHaveLength(1)
    expect(months[0].rows[0].cells).toHaveLength(7)
    expect(months[0].rows[0].cells.filter(Boolean)).toHaveLength(1)
    expect(months[0].rows[0].cells[0]).toMatchObject({ key: '2026-01-05' })
    expect(months[0].rows[0].cells.slice(1).every(c => c === null)).toBe(true)
  })
})

describe('completionRate', () => {
  it('ignores the still-open current period', () => {
    const habit = makeHabit({
      checkIns: {
        '2026-01-05': { at: 1, note: '' },
        '2026-01-06': { at: 1, note: '' },
      },
    })
    expect(completionRate(habit, new Date('2026-01-07T09:00:00'))).toBe(100)
  })

  it('reports a partial rate when periods were missed', () => {
    const habit = makeHabit({ checkIns: { '2026-01-05': { at: 1, note: '' } } })
    expect(completionRate(habit, new Date('2026-01-07T09:00:00'))).toBe(50)
  })
})

describe('custom weekday cadence', () => {
  const customHabit = (weekdays, checkIns = {}) => makeHabit({
    cadenceDays: 'custom',
    weekdays,
    checkIns,
  })

  it('only produces active periods on the selected weekdays', () => {
    const habit = customHabit([1, 3, 5])
    const periods = habitPeriods(habit, new Date('2026-01-12T12:00:00'))
    expect(periods.filter(p => !p.rest).map(p => p.key)).toEqual([
      '2026-01-05', '2026-01-07', '2026-01-09', '2026-01-12',
    ])
  })

  it('marks unselected weekdays as rest periods', () => {
    const habit = customHabit([1, 3, 5])
    const periods = habitPeriods(habit, new Date('2026-01-12T12:00:00'))
    expect(periods.map(p => p.key)).toEqual([
      '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08',
      '2026-01-09', '2026-01-10', '2026-01-11', '2026-01-12',
    ])
    expect(periods.filter(p => p.rest).map(p => p.key)).toEqual([
      '2026-01-06', '2026-01-08', '2026-01-10', '2026-01-11',
    ])
    expect(periods.filter(p => p.rest).every(p => p.done === false)).toBe(true)
  })

  it('treats an unselected weekday as a rest day', () => {
    const habit = customHabit([1, 3, 5])
    expect(currentPeriodKey(habit, new Date('2026-01-06T12:00:00'))).toBeNull()
    expect(isPending(habit, new Date('2026-01-06T12:00:00'))).toBe(false)
  })

  it('is pending on a selected weekday', () => {
    const habit = customHabit([1, 3, 5])
    expect(currentPeriodKey(habit, new Date('2026-01-07T12:00:00'))).toBe('2026-01-07')
    expect(isPending(habit, new Date('2026-01-07T12:00:00'))).toBe(true)
  })

  it('counts streaks across only the selected days', () => {
    const habit = customHabit([1, 3, 5], {
      '2026-01-05': { at: 1, note: '' },
      '2026-01-07': { at: 1, note: '' },
      '2026-01-09': { at: 1, note: '' },
    })
    const streak = habitStreak(habit, new Date('2026-01-09T20:00:00'))
    expect(streak).toMatchObject({ current: 3, best: 3, total: 3 })
  })

  it('does not punish the user on rest days between check-ins', () => {
    const habit = customHabit([1, 3, 5], {
      '2026-01-05': { at: 1, note: '' },
      '2026-01-07': { at: 1, note: '' },
    })
    const streak = habitStreak(habit, new Date('2026-01-08T12:00:00'))
    expect(streak.current).toBe(2)
  })

  it('yields no periods when no weekday is picked', () => {
    expect(habitPeriods(customHabit([]), new Date('2026-01-12T12:00:00'))).toEqual([])
  })

  it('cleans up the weekday list', () => {
    expect(normalizeWeekdays([3, 1, 3, 9, -1, 'x', 0])).toEqual([0, 1, 3])
    expect(normalizeWeekdays(null)).toEqual([])
  })
})

describe('habitCompletion', () => {
  it('reports remaining check-ins for a count target', () => {
    const habit = makeHabit({
      targetKind: 'count', targetCount: 5,
      checkIns: {
        '2026-01-05': { at: 1, note: '' },
        '2026-01-06': { at: 1, note: '' },
      },
    })
    const done = habitCompletion(habit, new Date('2026-01-07T12:00:00'))
    expect(done).toMatchObject({ kind: 'count', done: false, remaining: 3 })
  })

  it('marks a count target done once reached', () => {
    const habit = makeHabit({
      targetKind: 'count', targetCount: 2,
      checkIns: {
        '2026-01-05': { at: 1, note: '' },
        '2026-01-06': { at: 1, note: '' },
      },
    })
    expect(habitCompletion(habit, new Date('2026-01-07T12:00:00')).done).toBe(true)
  })

  it('counts days left for a date target', () => {
    const habit = makeHabit({ targetKind: 'date', targetDate: '2026-01-10' })
    const c = habitCompletion(habit, new Date('2026-01-07T12:00:00'))
    expect(c).toMatchObject({ kind: 'date', done: false, daysLeft: 3 })
  })

  it('marks a date target done once it is past', () => {
    const habit = makeHabit({ targetKind: 'date', targetDate: '2026-01-06' })
    expect(habitCompletion(habit, new Date('2026-01-08T12:00:00')).done).toBe(true)
  })

  it('never completes an endless habit', () => {
    const habit = makeHabit()
    expect(habitCompletion(habit, new Date('2027-01-01T12:00:00'))).toMatchObject({ kind: 'endless', done: false })
  })
})

describe('isRescue', () => {
  it('is true when the previous period was missed', () => {
    const habit = makeHabit({ checkIns: { '2026-01-05': { at: 1, note: '' } } })
    expect(isRescue(habit, new Date('2026-01-07T12:00:00'))).toBe(true)
  })

  it('is false on an unbroken run', () => {
    const habit = makeHabit({
      checkIns: {
        '2026-01-05': { at: 1, note: '' },
        '2026-01-06': { at: 1, note: '' },
      },
    })
    expect(isRescue(habit, new Date('2026-01-07T12:00:00'))).toBe(false)
  })

  it('is false on the very first period', () => {
    expect(isRescue(makeHabit(), new Date('2026-01-05T12:00:00'))).toBe(false)
  })
})

describe('currentPeriodKey', () => {
  it('tracks the weekly period the habit is in', () => {
    const habit = makeHabit({ cadenceDays: 7 })
    expect(currentPeriodKey(habit, new Date('2026-01-09T12:00:00'))).toBe('2026-01-05')
  })
})
