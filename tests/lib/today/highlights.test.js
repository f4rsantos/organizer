import { describe, it, expect } from 'vitest'
import { attachStudy, buildHighlights, layoutToday } from '../../../src/lib/today/highlights.js'

const TODAY = '2026-10-14'
const CLASSES = [{ id: 'c1', name: 'Cálculo' }, { id: 'c2', name: 'Física' }]
const KANBAN = {
  s1: { columns: [{ id: 'todo', title: 'To Do', order: 0 }, { id: 'wip', title: 'Doing', order: 1 }, { id: 'done', title: 'Done', order: 2 }] },
}

function highlights(overrides = {}) {
  return buildHighlights({ today: TODAY, classes: CLASSES, events: [], tasks: [], kanban: KANBAN, ...overrides })
}

describe('buildHighlights', () => {
  it('gathers tests, events, list tasks and kanban cards with dates in the next days, soonest first', () => {
    const events = [
      { id: 'e1', title: 'Teste Física', date: '2026-10-18' },
      { id: 'e2', title: 'Dentist', date: '2026-10-16' },
      { id: 'e3', title: 'Cálculo - T', date: '2026-10-15' },
    ]
    const tasks = [
      { id: 't1', title: 'Report', dueDate: '2026-10-15', done: false },
      { id: 'k1', title: 'Poster', semesterId: 's1', dueDate: '2026-10-17', done: false, views: { list: false, kanban: true }, kanban: { columnId: 'wip', order: 0 } },
      { id: 't2', title: 'Finished', dueDate: '2026-10-15', done: true },
    ]
    expect(highlights({ events, tasks }).map(h => [h.kind, h.title, h.daysLeft])).toEqual([
      ['task', 'Report', 1],
      ['event', 'Dentist', 2],
      ['card', 'Poster', 3],
      ['exam', 'Teste Física', 4],
    ])
  })

  it('puts a test before other items due the same day and keeps the card column', () => {
    const events = [{ id: 'e1', title: 'Exame Cálculo', date: '2026-10-15' }]
    const tasks = [{ id: 'k1', title: 'Poster', semesterId: 's1', dueDate: '2026-10-15', done: false, views: { list: false }, kanban: { columnId: 'wip', order: 0 } }]
    expect(highlights({ events, tasks })).toEqual([
      expect.objectContaining({ kind: 'exam', classId: 'c1', className: 'Cálculo' }),
      expect.objectContaining({ kind: 'card', column: 'Doing' }),
    ])
  })

  it('only includes the sources the user picked', () => {
    const events = [{ id: 'e1', title: 'Teste Física', date: '2026-10-18' }, { id: 'e2', title: 'Dentist', date: '2026-10-16' }]
    const tasks = [
      { id: 't1', title: 'Report', dueDate: '2026-10-15', done: false },
      { id: 'k1', title: 'Poster', semesterId: 's1', dueDate: '2026-10-17', done: false, views: { list: false }, kanban: { columnId: 'wip', order: 0 } },
    ]
    const sources = { exams: true, events: false, tasks: false, cards: true }
    expect(highlights({ events, tasks, sources }).map(h => h.kind)).toEqual(['card', 'exam'])
  })

  it('leaves out past items and items beyond the horizon', () => {
    const events = [{ id: 'old', title: 'Party', date: '2026-10-10' }, { id: 'far', title: 'Trip', date: '2026-12-20' }]
    expect(highlights({ events })).toEqual([])
  })
})

describe('attachStudy', () => {
  it('folds the study suggestion into the first test of the same class', () => {
    const list = [{ kind: 'task', id: 't' }, { kind: 'exam', id: 'e', classId: 'c2' }]
    const study = { kind: 'study', classId: 'c2', reason: 'exam' }
    expect(attachStudy(list, study)[1]).toMatchObject({ id: 'e', study })
  })
})

describe('layoutToday', () => {
  const study = { kind: 'study', classId: 'c2', reason: 'exam' }
  const rest = { kind: 'rest', reason: 'clear' }

  it('puts the first highlights in the big cards, the rest in coming up, and does not repeat the folded study', () => {
    const list = [{ kind: 'task', id: 't' }, { kind: 'exam', id: 'e', classId: 'c2' }, { kind: 'event', id: 'v' }]
    const layout = layoutToday({ brief: [study, rest], highlights: list, count: 2 })
    expect(layout.headlines.map(h => h.id)).toEqual(['t', 'e'])
    expect(layout.headlines[1].study).toBe(study)
    expect(layout.upcoming.map(h => h.id)).toEqual(['v'])
    expect(layout.recommendationItems).toEqual([rest])
    expect([...layout.excludeIds]).toEqual(['t', 'e'])
  })

  it('leads with rest when nothing is coming up', () => {
    const layout = layoutToday({ brief: [rest], highlights: [], count: 1 })
    expect(layout.headlines).toEqual([rest])
    expect(layout.recommendationItems).toEqual([])
  })
})
