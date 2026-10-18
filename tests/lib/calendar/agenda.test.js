import { describe, it, expect } from 'vitest'
import { buildAgenda } from '../../../src/lib/calendar/agenda.js'

const FROM = new Date(2026, 9, 18)

function state(overrides = {}) {
  return {
    settings: { semesterMode: 'none' },
    activeSemesterId: null,
    semesters: [],
    classes: [],
    tasks: [],
    events: [],
    ...overrides,
  }
}

describe('agenda', () => {
  it('lists each day with its timed events in start order', () => {
    const agenda = buildAgenda(state({
      events: [
        { id: 'b', title: 'Lunch', date: '2026-10-18', startTime: '13:00' },
        { id: 'a', title: 'Gym', date: '2026-10-18', startTime: '07:30', endTime: '08:30' },
      ],
    }), { from: FROM, days: 1 })
    expect(agenda.days[0].items.map(i => [i.title, i.range?.start])).toEqual([['Gym', '07:30'], ['Lunch', '13:00']])
  })

  it('places a task on its due date with its class name', () => {
    const agenda = buildAgenda(state({
      classes: [{ id: 'c1', name: 'Physics', semesterId: null }],
      tasks: [{ id: 't', title: 'Lab', dueDate: '2026-10-19', classId: 'c1', views: { list: true } }],
    }), { from: FROM, days: 3 })
    expect(agenda.days[1].items).toMatchObject([{ kind: 'task', title: 'Lab', className: 'Physics' }])
  })

  it('repeats a weekly event on each matching day', () => {
    const agenda = buildAgenda(state({
      events: [{ id: 'e', title: 'Seminar', date: '2026-10-11', startTime: '10:00', recurrence: { freq: 'weekly' } }],
    }), { from: FROM, days: 8 })
    const days = agenda.days.filter(d => d.items.length).map(d => d.date)
    expect(days).toEqual(['2026-10-18', '2026-10-25'])
  })

  it('collects unfinished tasks that are past due', () => {
    const agenda = buildAgenda(state({
      tasks: [
        { id: 'late', title: 'Late', dueDate: '2026-10-10', views: { list: true } },
        { id: 'doneLate', title: 'Done', dueDate: '2026-10-10', done: true, views: { list: true } },
      ],
    }), { from: FROM, days: 1 })
    expect(agenda.overdue.map(t => t.title)).toEqual(['Late'])
  })

  it('leaves out events of another semester', () => {
    const agenda = buildAgenda(state({
      settings: { semesterMode: 'semesters' },
      activeSemesterId: 's1',
      events: [{ id: 'x', title: 'Old', date: '2026-10-18', semesterId: 's0' }],
    }), { from: FROM, days: 1 })
    expect(agenda.days[0].items).toEqual([])
  })
})
