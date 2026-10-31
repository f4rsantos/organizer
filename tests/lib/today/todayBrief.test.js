import { describe, it, expect } from 'vitest'
import { buildTodayBrief } from '../../../src/lib/today/todayBrief.js'

const TODAY = '2026-10-14'
const CALC = { id: 'c1', name: 'Cálculo' }
const PHYS = { id: 'c2', name: 'Física' }
const CLASSES = [CALC, PHYS]

function brief(overrides = {}) {
  return buildTodayBrief({ today: TODAY, classes: CLASSES, events: [], tasks: [], lessons: null, holidays: [], ...overrides })
}

function kinds(items) {
  return items.map(item => item.kind)
}

describe('buildTodayBrief exams', () => {
  it('flags an exam today and counts down to upcoming ones inside the horizon', () => {
    const events = [
      { id: 'a', title: 'Teste Cálculo', date: TODAY },
      { id: 'b', title: 'Exame Física', date: '2026-10-19' },
      { id: 'c', title: 'Exame Cálculo', date: '2026-12-20' },
    ]
    const items = brief({ events })
    expect(items.find(i => i.kind === 'examToday')).toMatchObject({ title: 'Teste Cálculo', className: 'Cálculo' })
    const soon = items.filter(i => i.kind === 'examSoon')
    expect(soon).toEqual([expect.objectContaining({ title: 'Exame Física', daysLeft: 5, className: 'Física' })])
  })

  it('counts every assessment event from a course calendar as an exam', () => {
    const events = [{ id: 'ei-1', title: 'Física M2: presentation', date: '2026-10-20', assessment: true }]
    expect(brief({ events }).find(i => i.kind === 'examSoon')).toMatchObject({ daysLeft: 6, className: 'Física' })
  })

  it('treats a task named as a test as an exam for its class', () => {
    const tasks = [{ id: 't', title: 'Mini-teste', dueDate: '2026-10-16', classId: 'c2', done: false }]
    expect(brief({ tasks }).find(i => i.kind === 'examSoon')).toMatchObject({ daysLeft: 2, className: 'Física' })
  })
})

describe('buildTodayBrief study suggestion', () => {
  const pastLessons = [
    { id: 'l1', title: 'Física - T', date: '2026-10-07' },
    { id: 'l2', title: 'Física - P', date: '2026-10-09' },
  ]

  it('suggests studying the class with an exam coming while its lessons are not done', () => {
    const events = [...pastLessons, { id: 'x', title: 'Teste Física', date: '2026-10-18' }]
    expect(brief({ events }).find(i => i.kind === 'study')).toMatchObject({ classId: 'c2', reason: 'exam', daysLeft: 4 })
  })

  it('does not nag about a class whose lessons are fully studied', () => {
    const events = [...pastLessons, { id: 'x', title: 'Teste Física', date: '2026-10-18' }]
    const ticked = { attend: true, slides: true, exercises: true, summary: true }
    const lessons = {
      c2: { sessions: { 'cal:l1:2026-10-07': { studied: ticked }, 'cal:l2:2026-10-09': { studied: ticked } } },
    }
    expect(kinds(brief({ events, lessons }))).not.toContain('study')
  })

  it('suggests catching up on the biggest backlog on an ordinary day', () => {
    expect(brief({ events: pastLessons }).find(i => i.kind === 'study')).toMatchObject({ classId: 'c2', reason: 'backlog', pending: 2 })
  })
})

describe('buildTodayBrief rest', () => {
  it('suggests rest when nothing is due soon', () => {
    expect(brief().find(i => i.kind === 'rest')).toMatchObject({ reason: 'clear' })
  })

  it('does not suggest rest while a task is due today', () => {
    const tasks = [{ id: 't', title: 'Report', dueDate: TODAY, done: false }]
    const items = brief({ tasks })
    expect(items.find(i => i.kind === 'tasksDue')).toMatchObject({ count: 1 })
    expect(kinds(items)).not.toContain('rest')
  })

  it('does not suggest rest the day before an exam', () => {
    const events = [{ id: 'x', title: 'Exame Cálculo', date: '2026-10-15' }]
    expect(kinds(brief({ events }))).not.toContain('rest')
  })

  it('on a holiday suggests rest instead of a study backlog', () => {
    const holidays = [{ id: 'h', name: 'Feriado', startDate: TODAY, endDate: TODAY }]
    const events = [{ id: 'l1', title: 'Física - T', date: '2026-10-07' }]
    const items = brief({ holidays, events })
    expect(items.find(i => i.kind === 'rest')).toMatchObject({ reason: 'holiday', name: 'Feriado' })
    expect(kinds(items)).not.toContain('study')
  })
})

describe('buildTodayBrief today overview', () => {
  it('lists today classes without the exams', () => {
    const events = [
      { id: 'a', title: 'Cálculo - T', date: TODAY, startTime: '09:00' },
      { id: 'b', title: 'Teste Física', date: TODAY },
    ]
    expect(brief({ events }).find(i => i.kind === 'classesToday').lessons).toEqual([{ name: 'Cálculo', color: null, startTime: '09:00' }])
  })

  it('lists today events that are not lessons alongside the classes', () => {
    const events = [
      { id: 'a', title: 'Cálculo - T', date: TODAY, startTime: '09:00' },
      { id: 'b', title: 'Dentist', date: TODAY, startTime: '15:30', color: '#64748b' },
      { id: 'c', title: 'Party', date: '2026-10-20' },
    ]
    expect(brief({ events }).find(i => i.kind === 'eventsToday').events).toEqual([{ title: 'Dentist', startTime: '15:30', color: '#64748b' }])
  })

  it('counts overdue tasks', () => {
    const tasks = [
      { id: 'a', title: 'Old', dueDate: '2026-10-01', done: false },
      { id: 'b', title: 'Done', dueDate: '2026-10-01', done: true },
    ]
    expect(brief({ tasks }).find(i => i.kind === 'overdue')).toMatchObject({ count: 1 })
  })
})

