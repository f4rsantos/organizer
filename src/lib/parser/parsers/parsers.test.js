import { describe, it, expect } from 'vitest'
import { parseTaskText } from '../nlpParse.js'

const NOW = new Date(2026, 6, 15)

function parse(text, lang = 'en') {
  return parseTaskText(text, { lang, now: NOW })
}

describe('DateParser (en)', () => {
  it('resolves relative dates', () => {
    expect(parse('today').date).toBe('2026-07-15')
    expect(parse('tomorrow').date).toBe('2026-07-16')
    expect(parse('yesterday').date).toBe('2026-07-14')
    expect(parse('day after tomorrow').date).toBe('2026-07-17')
  })

  it('resolves a bare weekday to the next occurrence', () => {
    expect(parse('friday').date).toBe('2026-07-17')
  })

  it('applies next/this/last weekday modifiers', () => {
    expect(parse('this friday').date).toBe('2026-07-17')
    expect(parse('next monday').date).toBe('2026-07-27')
    expect(parse('last monday').date).toBe('2026-07-13')
  })

  it('applies next/this/last to a bare week', () => {
    expect(parse('this week').date).toBe('2026-07-13')
    expect(parse('next week').date).toBe('2026-07-20')
    expect(parse('last week').date).toBe('2026-07-06')
  })

  it('parses slash dates', () => {
    expect(parse('18/07').date).toBe('2026-07-18')
    expect(parse('18/07/2027').date).toBe('2027-07-18')
    expect(parse('18/07/27').date).toBe('2027-07-18')
  })

  it('rejects an impossible slash date', () => {
    expect(parse('31/02').date).toBeNull()
  })

  it('parses a week number', () => {
    expect(parse('week 12').week).toBe(12)
  })

  it('parses "<ordinal> week of <month>"', () => {
    expect(parse('second week of august').date).toBe('2026-08-10')
  })
})

describe('TimeParser (en)', () => {
  it('parses explicit clock times', () => {
    expect(parse('15:30').startTime).toBe('15:30')
    expect(parse('15h30').startTime).toBe('15:30')
    expect(parse('15h').startTime).toBe('15:00')
    expect(parse('1530').startTime).toBe('15:30')
  })

  it('parses am/pm forms', () => {
    expect(parse('3pm').startTime).toBe('15:00')
    expect(parse('3 pm').startTime).toBe('15:00')
    expect(parse('12am').startTime).toBe('00:00')
    expect(parse('12pm').startTime).toBe('12:00')
  })

  it('parses spelled-out minute offsets', () => {
    expect(parse('half past 3').startTime).toBe('03:30')
    expect(parse('quarter past 3').startTime).toBe('03:15')
  })

  it('applies a trailing am/pm to a spelled-out minute offset', () => {
    expect(parse('half past 3 pm').startTime).toBe('15:30')
    expect(parse('quarter past 3 pm').startTime).toBe('15:15')
    expect(parse('half past 3 am').startTime).toBe('03:30')
  })

  it('applies a trailing pm across an hour borrow', () => {
    expect(parse('quarter to 4 pm').startTime).toBe('15:45')
    expect(parse('quarter to 4').startTime).toBe('03:45')
  })

  it('leaves the am/pm word out of the title', () => {
    expect(parse('standup half past 3 pm').title).toBe('standup')
  })

  it('parses a time range', () => {
    const r = parse('15h-17h')
    expect(r.startTime).toBe('15:00')
    expect(r.endTime).toBe('17:00')
  })

  it('parses a bare hour introduced by "at"', () => {
    expect(parse('meeting at 3').startTime).toBe('03:00')
  })

  it('rejects out-of-range clock values', () => {
    expect(parse('25:00').startTime).toBeNull()
    expect(parse('10:75').startTime).toBeNull()
  })
})

describe('DurationParser (en)', () => {
  it('converts hours and minutes to minutes', () => {
    expect(parse('2 hours').duration).toBe(120)
    expect(parse('30 minutes').duration).toBe(30)
    expect(parse('90 min').duration).toBe(90)
  })

  it('reads a bare "2h" as a clock time, not a duration', () => {
    const r = parse('2h')
    expect(r.startTime).toBe('02:00')
    expect(r.duration).toBeNull()
  })

  it('absorbs a leading "for" into the duration span', () => {
    const r = parse('study for 2 hours')
    expect(r.duration).toBe(120)
    expect(r.title).toBe('study')
  })
})

describe('RecurrenceParser (en)', () => {
  it('parses standalone frequency words', () => {
    expect(parse('daily').recurrence).toEqual({ freq: 'daily', interval: 1 })
    expect(parse('weekly').recurrence).toEqual({ freq: 'weekly', interval: 1 })
  })

  it('parses "every <weekday>"', () => {
    expect(parse('every monday').recurrence).toEqual({ freq: 'weekly', interval: 1, weekday: 1 })
  })

  it('parses "every <n> <unit>"', () => {
    expect(parse('every 2 weeks').recurrence).toEqual({ freq: 'weekly', interval: 2 })
  })

  it('does not treat a bare interval-less noun as a recurrence', () => {
    expect(parse('day').recurrence).toBeNull()
  })
})

describe('PriorityParser (en)', () => {
  it('parses pN shorthand', () => {
    expect(parse('p1').priority).toBe(1)
    expect(parse('p3').priority).toBe(3)
  })

  it('parses spelled priority phrases', () => {
    expect(parse('high priority').priority).toBe(1)
    expect(parse('medium priority').priority).toBe(2)
    expect(parse('low priority').priority).toBe(3)
  })
})

describe('ActionParser (en)', () => {
  it('parses navigation commands', () => {
    const r = parseTaskText('open settings', { lang: 'en', now: NOW })
    expect(r.action).toEqual({ type: 'nav', target: 'settings' })
  })

  it('parses mutation verbs', () => {
    expect(parse('delete groceries').action.action).toBe('delete')
    expect(parse('complete groceries').action.action).toBe('complete')
    expect(parse('remove groceries').action.action).toBe('delete')
  })

  it('suppresses mutation verbs when allowMutation is false', () => {
    const r = parseTaskText('delete groceries', { lang: 'en', now: NOW, allowMutation: false })
    expect(r.action).toBeNull()
  })
})

describe('EntityParser (en)', () => {
  const classes = [{ id: 'c1', name: 'calculus' }]
  const columns = [{ id: 'col1', title: 'doing' }]
  const teams = { t1: { name: 'study group' } }

  it('matches a class name', () => {
    const r = parseTaskText('homework calculus', { lang: 'en', now: NOW, classes })
    expect(r.classId).toBe('c1')
  })

  it('matches a column only behind a preposition', () => {
    const withPrep = parseTaskText('card on doing', { lang: 'en', now: NOW, columns })
    expect(withPrep.columnId).toBe('col1')

    const bare = parseTaskText('doing', { lang: 'en', now: NOW, columns })
    expect(bare.columnId).toBeNull()
  })

  it('matches a team behind "with"', () => {
    const r = parseTaskText('share with study group', { lang: 'en', now: NOW, teams })
    expect(r.teamId).toBe('t1')
  })
})

describe('title cleanliness (en)', () => {
  it('strips every recognised span out of the title', () => {
    const r = parse('essay draft tomorrow at 3pm high priority')
    expect(r.title).toBe('essay draft')
    expect(r.date).toBe('2026-07-16')
    expect(r.startTime).toBe('15:00')
    expect(r.priority).toBe(1)
  })

  it('leaves unrecognised text intact', () => {
    expect(parse('read chapter four').title).toContain('read chapter')
  })
})
