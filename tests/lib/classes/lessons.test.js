import { describe, it, expect } from 'vitest'
import {
  DEFAULT_STUDY_TYPES, arrangeSessions, classProgress, lessonSessions, normalizeLessons, progressBucket,
  sessionProgress, withManualSession, withSessionPatch, withoutSession,
} from '../../../src/lib/classes/lessons.js'

const CALC = { id: 'c1', name: 'Cálculo' }
const TODAY = '2026-10-15'

function weekly(id, title, date) {
  return { id: `${id}::${date}`, templateId: id, title, date, isRecurringOccurrence: true }
}

const EVENTS = [
  weekly('t', 'Cálculo - T', '2026-10-01'),
  weekly('t', 'Cálculo - T', '2026-10-08'),
  weekly('t', 'Cálculo - T', '2026-10-15'),
  weekly('t', 'Cálculo - T', '2026-10-22'),
  weekly('p', 'Cálculo - P', '2026-10-09'),
  { id: 'x', title: 'Teste Cálculo', date: '2026-10-10' },
  { id: 'y', title: 'Física - T', date: '2026-10-02' },
]

describe('lessonSessions', () => {
  it('lists past and current calendar lessons of the class, excluding exams and future ones', () => {
    const sessions = lessonSessions({ cls: CALC, events: EVENTS, record: null, today: TODAY })
    expect(sessions.map(s => [s.date, s.type])).toEqual([
      ['2026-10-01', 'T'], ['2026-10-08', 'T'], ['2026-10-09', 'P'], ['2026-10-15', 'T'],
    ])
  })

  it('takes the lesson type from the event description when the title has none', () => {
    const events = [{ id: 'd', title: 'Cálculo', note: 'PL2 · Sala 4.1.08', date: '2026-10-02' }]
    expect(lessonSessions({ cls: CALC, events, record: null, today: TODAY })[0].type).toBe('PL')
  })

  it('does not count a lesson later today until it has started', () => {
    const events = [{ id: 'm', title: 'Cálculo - T', date: TODAY, startTime: '14:00' }]
    const before = lessonSessions({ cls: CALC, events, record: null, today: TODAY, nowTime: '09:30' })
    const after = lessonSessions({ cls: CALC, events, record: null, today: TODAY, nowTime: '14:00' })
    expect(before).toEqual([])
    expect(after.map(s => s.date)).toEqual([TODAY])
  })

  it('adds manually counted lessons and applies saved edits to calendar ones', () => {
    let lessons = withManualSession(null, 'c1', { key: 'man:1', date: '2026-10-12', type: 'TP' })
    const calendarKey = lessonSessions({ cls: CALC, events: EVENTS, record: lessons.c1, today: TODAY })[0].key
    lessons = withSessionPatch(lessons, 'c1', calendarKey, { theme: 'Limits', type: 'TP' })

    const sessions = lessonSessions({ cls: CALC, events: EVENTS, record: lessons.c1, today: TODAY })
    expect(sessions).toHaveLength(5)
    expect(sessions[0]).toMatchObject({ theme: 'Limits', type: 'TP', manual: false })
    expect(sessions.find(s => s.key === 'man:1')).toMatchObject({ date: '2026-10-12', type: 'TP', manual: true })
  })

  it('removing a manual lesson deletes it, removing a calendar lesson hides it', () => {
    let lessons = withManualSession(null, 'c1', { key: 'man:1', date: '2026-10-12', type: 'other' })
    const calendarKey = lessonSessions({ cls: CALC, events: EVENTS, record: lessons.c1, today: TODAY })[0].key
    lessons = withoutSession(lessons, 'c1', 'man:1')
    lessons = withoutSession(lessons, 'c1', calendarKey)

    const sessions = lessonSessions({ cls: CALC, events: EVENTS, record: lessons.c1, today: TODAY })
    expect(sessions.map(s => s.date)).toEqual(['2026-10-08', '2026-10-09', '2026-10-15'])
    expect(lessons.c1.sessions).not.toHaveProperty('man:1')
  })
})

describe('progress', () => {
  const types = DEFAULT_STUDY_TYPES

  it('scores a lesson by how many of the study steps are ticked', () => {
    const session = { studied: { attend: true, slides: true } }
    expect(sessionProgress(session, types)).toBe(2 / types.length)
  })

  it('ignores ticks for study steps the class no longer uses', () => {
    const session = { studied: { attend: true, retired: true } }
    expect(sessionProgress(session, [{ id: 'attend' }])).toBe(1)
  })

  it('aggregates every lesson of the class into one ratio', () => {
    const sessions = [
      { studied: Object.fromEntries(types.map(t => [t.id, true])) },
      { studied: {} },
    ]
    expect(classProgress(sessions, types)).toEqual({ done: types.length, total: types.length * 2, pct: 0.5 })
  })

  it('buckets classes into to do, doing, almost and done', () => {
    expect(progressBucket({ pct: 0, total: 0 })).toBe('todo')
    expect(progressBucket({ pct: 0, total: 8 })).toBe('todo')
    expect(progressBucket({ pct: 0.4, total: 8 })).toBe('doing')
    expect(progressBucket({ pct: 0.8, total: 8 })).toBe('almost')
    expect(progressBucket({ pct: 1, total: 8 })).toBe('done')
  })

})

describe('arrangeSessions', () => {
  const sessions = [
    { key: 'a', date: '2026-10-01', type: 'T' },
    { key: 'b', date: '2026-10-09', type: 'P' },
    { key: 'c', date: '2026-10-08', type: 'T' },
  ]

  it('orders newest first or oldest first', () => {
    expect(arrangeSessions(sessions, { order: 'newest', type: 'all' }).map(s => s.key)).toEqual(['b', 'c', 'a'])
    expect(arrangeSessions(sessions, { order: 'oldest', type: 'all' }).map(s => s.key)).toEqual(['a', 'c', 'b'])
  })

  it('keeps only lessons of the chosen type', () => {
    expect(arrangeSessions(sessions, { order: 'oldest', type: 'T' }).map(s => s.key)).toEqual(['a', 'c'])
  })
})

describe('normalizeLessons', () => {
  it('drops malformed class records and keeps valid ones', () => {
    const value = { c1: { sessions: { k: { theme: 'x' } } }, c2: 'junk', c3: { sessions: [] } }
    expect(normalizeLessons(value)).toEqual({ c1: { sessions: { k: { theme: 'x' } } }, c3: { sessions: {} } })
  })

  it('stores nothing when there is no lesson data', () => {
    expect(normalizeLessons(undefined)).toBeNull()
    expect(normalizeLessons({})).toBeNull()
  })
})
