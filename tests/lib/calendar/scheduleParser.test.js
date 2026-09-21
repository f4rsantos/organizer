import { describe, it, expect } from 'vitest'
import { parseScheduleText, matchDay, splitTitleAndNote } from '../../../src/lib/calendar/scheduleParser'

describe('matchDay', () => {
  it('matches english and abbreviations', () => {
    expect(matchDay('Monday')).toBe(0)
    expect(matchDay('MON')).toBe(0)
    expect(matchDay('Fri')).toBe(4)
  })

  it('matches other languages regardless of app language', () => {
    expect(matchDay('Segunda')).toBe(0)
    expect(matchDay('quinta-feira')).toBe(3)
    expect(matchDay('Miércoles')).toBe(2)
    expect(matchDay('Donnerstag')).toBe(3)
    expect(matchDay('vendredi')).toBe(4)
  })

  it('matches weekend days', () => {
    expect(matchDay('Saturday')).toBe(5)
    expect(matchDay('Sábado')).toBe(5)
    expect(matchDay('Domingo')).toBe(6)
    expect(matchDay('Sunday')).toBe(6)
  })

  it('rejects non-days', () => {
    expect(matchDay('40382')).toBeNull()
    expect(matchDay('')).toBeNull()
  })
})

describe('parseScheduleText', () => {
  it('parses day, time range and title', () => {
    const { rows } = parseScheduleText('Monday 09:00 11:00 Algorithms')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      dayIndex: 0, startTime: '09:00', endTime: '11:00', title: 'Algorithms',
    })
  })

  it('puts room and class-type info in the note, not the title', () => {
    const { rows } = parseScheduleText('WED 09:00 - 11:00 CD - 40382 - P1 - 04.2.11')
    expect(rows[0].dayIndex).toBe(2)
    expect(rows[0].startTime).toBe('09:00')
    expect(rows[0].endTime).toBe('11:00')
    expect(rows[0].title).toBe('CD')
    expect(rows[0].note).toContain('04.2.11')
    expect(rows[0].title).not.toContain('04.2.11')
  })

  it('leaves the note empty when there is no extra info', () => {
    const { rows } = parseScheduleText('Monday 09:00 11:00 Algorithms')
    expect(rows[0].note).toBe('')
  })

  it('handles weekend rows', () => {
    const { rows } = parseScheduleText('Sábado 10:00 12:00 Lab')
    expect(rows[0].dayIndex).toBe(5)
  })

  it('accepts 9h30 and 9.30 and am/pm forms', () => {
    expect(parseScheduleText('Mon 9h30 11h00 X').rows[0].startTime).toBe('09:30')
    expect(parseScheduleText('Mon 9.30 11.00 X').rows[0].startTime).toBe('09:30')
    expect(parseScheduleText('Mon 2:00pm 4:00pm X').rows[0].startTime).toBe('14:00')
  })

  it('allows a start time with no end time', () => {
    const { rows } = parseScheduleText('Tue 14:00 Seminar')
    expect(rows[0].startTime).toBe('14:00')
    expect(rows[0].endTime).toBeNull()
  })

  it('parses multiple lines and reports unparseable ones', () => {
    const { rows, errors } = parseScheduleText([
      'Monday 09:00 11:00 Maths',
      '',
      'total: 12 credits',
      'Friday 15:00 17:00 Physics',
    ].join('\n'))
    expect(rows).toHaveLength(2)
    expect(errors).toHaveLength(1)
    expect(errors[0].reason).toBe('no-day')
  })

  it('does not treat a bare class code as a time', () => {
    const { rows, errors } = parseScheduleText('Monday CD 40382')
    expect(rows).toHaveLength(0)
    expect(errors[0].reason).toBe('no-time')
  })

  it('returns empty for empty input', () => {
    expect(parseScheduleText('').rows).toHaveLength(0)
    expect(parseScheduleText(null).rows).toHaveLength(0)
  })
})

describe('splitTitleAndNote', () => {
  it('drops a bare numeric code', () => {
    expect(splitTitleAndNote('CD - 40382')).toEqual({ title: 'CD', note: '' })
  })

  it('keeps codes that carry a letter or a dot', () => {
    expect(splitTitleAndNote('CD - P1').note).toBe('P1')
    expect(splitTitleAndNote('CD - 04.2.11').note).toBe('04.2.11')
  })

  it('moves a room code to the note', () => {
    const r = splitTitleAndNote('SIO - 42573 - TP1 - ANF. IV')
    expect(r.title).toBe('SIO')
    expect(r.note).toContain('TP1')
    expect(r.note).toContain('ANF. IV')
  })

  it('handles a plain title', () => {
    expect(splitTitleAndNote('Algorithms')).toEqual({ title: 'Algorithms', note: '' })
  })
})
