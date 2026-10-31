import { describe, it, expect } from 'vitest'
import { buildRecommendations } from '../../../src/lib/today/recommendations.js'
import { normalizeTodaySettings } from '../../../src/lib/today/todaySettings.js'

const TODAY = '2026-10-14'
const ALL_ON = normalizeTodaySettings(undefined).recommend

const KANBAN = {
  s1: { columns: [{ id: 'todo', title: 'To Do', order: 0 }, { id: 'wip', title: 'Doing', order: 1 }, { id: 'done', title: 'Done', order: 2 }] },
}

function recs(overrides = {}) {
  return buildRecommendations({ today: TODAY, prefs: ALL_ON, items: [], tasks: [], kanban: KANBAN, ...overrides })
}

describe('buildRecommendations', () => {
  it('points at the overdue task before tasks due later', () => {
    const tasks = [
      { id: 'a', title: 'Later', dueDate: '2026-10-20', done: false },
      { id: 'b', title: 'Late', dueDate: '2026-10-10', done: false },
    ]
    expect(recs({ tasks }).find(r => r.kind === 'task')).toMatchObject({ title: 'Late', daysLeft: -4 })
  })

  it('suggests moving forward a card that sits in an in-progress kanban column', () => {
    const tasks = [
      { id: 'k', title: 'Poster', semesterId: 's1', done: false, kanban: { columnId: 'wip', order: 0 } },
      { id: 't', title: 'Fresh', semesterId: 's1', done: false, kanban: { columnId: 'todo', order: 0 } },
    ]
    expect(recs({ tasks }).find(r => r.kind === 'kanban')).toMatchObject({ title: 'Poster', column: 'Doing' })
  })

  it('explains a task suggestion with its due date, priority and checklist', () => {
    const tasks = [{
      id: 'a', title: 'Report', dueDate: '2026-10-15', priority: 'high', done: false,
      checklist: [{ id: '1', done: true }, { id: '2', done: false }],
    }]
    expect(recs({ tasks }).find(r => r.kind === 'task')).toMatchObject({
      title: 'Report', daysLeft: 1, highPriority: true, checklist: { done: 1, total: 2 },
    })
  })

  it('explains a kanban suggestion with its column, checklist and due date', () => {
    const tasks = [{
      id: 'k', title: 'Poster', semesterId: 's1', dueDate: TODAY, done: false, views: { list: false, kanban: true },
      kanban: { columnId: 'wip', order: 0 }, checklist: [{ id: '1', done: true }, { id: '2', done: true }, { id: '3', done: false }],
    }]
    expect(recs({ tasks }).find(r => r.kind === 'kanban')).toMatchObject({
      title: 'Poster', column: 'Doing', daysLeft: 0, checklist: { done: 2, total: 3 },
    })
  })

  it('only suggests list tasks as tasks, leaving board-only cards to the kanban suggestion', () => {
    const tasks = [{ id: 'k', title: 'Board only', semesterId: 's1', dueDate: TODAY, done: false, views: { list: false, kanban: true }, kanban: { columnId: 'todo', order: 0 } }]
    expect(recs({ tasks }).map(r => r.kind)).toEqual([])
  })

  it('does not suggest the same card twice as task and kanban', () => {
    const tasks = [{ id: 'k', title: 'Poster', semesterId: 's1', dueDate: '2026-10-15', done: false, kanban: { columnId: 'wip', order: 0 } }]
    expect(recs({ tasks }).map(r => r.kind)).toEqual(['task'])
  })

  it('skips work that is already shown as a highlight', () => {
    const tasks = [{ id: 'a', title: 'Late', dueDate: '2026-10-10', done: false }]
    expect(recs({ tasks, excludeIds: new Set(['a']) })).toEqual([])
  })

  it('carries the study and rest suggestions from the brief', () => {
    const items = [{ kind: 'study', classId: 'c1', className: 'Física', reason: 'backlog', pending: 3 }, { kind: 'rest', reason: 'clear' }]
    expect(recs({ items }).map(r => r.kind)).toEqual(['study', 'rest'])
  })

  it('leaves out every kind the user switched off', () => {
    const items = [{ kind: 'rest', reason: 'clear' }]
    const tasks = [{ id: 'a', title: 'Late', dueDate: '2026-10-10', done: false }]
    const prefs = { ...ALL_ON, tasks: false, rest: false }
    expect(recs({ items, tasks, prefs })).toEqual([])
  })
})

describe('normalizeTodaySettings', () => {
  it('keeps the chosen name and switches, filling in anything missing', () => {
    const settings = normalizeTodaySettings({ name: '  Fernando ', showUpcoming: false, recommend: { kanban: false } })
    expect(settings).toMatchObject({ name: 'Fernando', showUpcoming: false, showWeather: true })
    expect(settings.recommend).toMatchObject({ kanban: false, study: true, tasks: true, rest: true })
  })

  it('keeps the headline count between one and three, defaulting to one', () => {
    expect(normalizeTodaySettings(undefined)).toMatchObject({ headlineCount: 1, showMotivation: true })
    expect(normalizeTodaySettings({ headlineCount: 3 }).headlineCount).toBe(3)
    expect(normalizeTodaySettings({ headlineCount: 7 }).headlineCount).toBe(1)
  })

  it('includes every highlight source and the good-to-know card unless switched off', () => {
    expect(normalizeTodaySettings(undefined)).toMatchObject({ showNotes: true, highlightSources: { exams: true, events: true, tasks: true, cards: true } })
    expect(normalizeTodaySettings({ highlightSources: { cards: false } }).highlightSources).toEqual({ exams: true, events: true, tasks: true, cards: false })
  })
})
