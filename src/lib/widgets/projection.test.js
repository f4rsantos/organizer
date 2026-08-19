import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import {
  buildProjection, buildTasksProjection, buildTodayProjection, buildKanbanProjection, emptyProjection,
  buildAgendaProjection, buildHabitsProjection, buildSummaryProjection, buildCalendarProjection,
  buildCalendarWeekProjection, buildCalendarDayProjection, buildCalendarYearProjection,
  buildPomodoroProjection,
} from './projection.js'

const TODAY = '2026-08-11'
const NOW = new Date(`${TODAY}T09:00:00`)

function task(over = {}) {
  return { id: 't1', title: 'Essay', done: false, dueDate: TODAY, classId: 'c1', ...over }
}

const CLASSES = [{ id: 'c1', name: 'Maths', color: '#6366f1' }]
const NONE_MODE = { settings: { semesterMode: 'none' } }
const HABITS_ON = { settings: { semesterMode: 'none', apps: { habits: true } } }

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterAll(() => {
  vi.useRealTimers()
})

describe('tasks projection', () => {
  it('includes a task due today', () => {
    const out = buildTasksProjection({ ...NONE_MODE, tasks: [task()], classes: CLASSES }, TODAY)
    expect(out).toEqual([{ id: 't1', title: 'Essay', dueDate: TODAY, className: 'Maths', classColor: '#6366f1', overdue: false }])
  })

  it('excludes done tasks', () => {
    expect(buildTasksProjection({ ...NONE_MODE, tasks: [task({ done: true })], classes: CLASSES }, TODAY)).toEqual([])
  })

  it('excludes tasks due in a later week', () => {
    expect(buildTasksProjection({ ...NONE_MODE, tasks: [task({ dueDate: '2026-09-01' })], classes: CLASSES }, TODAY)).toEqual([])
  })

  it('includes an undated task scoped to the current week', () => {
    const state = { ...NONE_MODE, tasks: [task({ dueDate: undefined, weekStart: 33, weekEnd: 33 })], classes: CLASSES }
    const out = buildTasksProjection(state, TODAY)
    expect(out).toEqual([{ id: 't1', title: 'Essay', dueDate: '', className: 'Maths', classColor: '#6366f1', overdue: false }])
  })

  it('excludes an undated task scoped to another week', () => {
    const state = { ...NONE_MODE, tasks: [task({ dueDate: undefined, weekStart: 40, weekEnd: 40 })], classes: CLASSES }
    expect(buildTasksProjection(state, TODAY)).toEqual([])
  })

  it('includes an undated task with no week set', () => {
    const state = { ...NONE_MODE, tasks: [task({ dueDate: undefined })], classes: CLASSES }
    expect(buildTasksProjection(state, TODAY)).toHaveLength(1)
  })

  it('keeps overdue tasks from earlier weeks', () => {
    const state = { ...NONE_MODE, tasks: [task({ dueDate: '2026-07-01' })], classes: CLASSES }
    expect(buildTasksProjection(state, TODAY)[0].overdue).toBe(true)
  })

  it('sorts overdue tasks first', () => {
    const state = {
      ...NONE_MODE,
      tasks: [task({ id: 'a', dueDate: TODAY }), task({ id: 'b', dueDate: '2026-07-01' })],
      classes: CLASSES,
    }
    expect(buildTasksProjection(state, TODAY).map(t => t.id)).toEqual(['b', 'a'])
  })

  it('flags an overdue task', () => {
    const out = buildTasksProjection({ ...NONE_MODE, tasks: [task({ dueDate: '2026-08-01' })], classes: CLASSES }, TODAY)
    expect(out[0].overdue).toBe(true)
  })

  it('leaves the class name blank when unknown', () => {
    const out = buildTasksProjection({ ...NONE_MODE, tasks: [task({ classId: 'nope' })], classes: CLASSES }, TODAY)
    expect(out[0].className).toBe('')
  })

  it('groups tasks by class in class order', () => {
    const classes = [
      { id: 'c1', name: 'Maths', color: '#6366f1' },
      { id: 'c2', name: 'Physics', color: '#f59e0b' },
    ]
    const state = {
      ...NONE_MODE,
      classes,
      tasks: [
        task({ id: 'p1', classId: 'c2' }),
        task({ id: 'none', classId: null }),
        task({ id: 'm1', classId: 'c1' }),
        task({ id: 'p2', classId: 'c2' }),
      ],
    }
    expect(buildTasksProjection(state, TODAY).map(t => t.id)).toEqual(['m1', 'p1', 'p2', 'none'])
  })

  it('keeps overdue first within a class', () => {
    const state = {
      ...NONE_MODE,
      classes: CLASSES,
      tasks: [
        task({ id: 'later', dueDate: TODAY }),
        task({ id: 'late', dueDate: '2026-07-01' }),
      ],
    }
    expect(buildTasksProjection(state, TODAY).map(t => t.id)).toEqual(['late', 'later'])
  })

  it('caps the list', () => {
    const tasks = Array.from({ length: 40 }, (_, i) => task({ id: `t${i}` }))
    expect(buildTasksProjection({ ...NONE_MODE, tasks, classes: CLASSES }, TODAY)).toHaveLength(25)
  })
})

describe('today projection', () => {
  it('includes a single day event', () => {
    const state = { events: [{ id: 'e1', title: 'Lecture', date: TODAY, startTime: '10:00' }], tasks: [] }
    expect(buildTodayProjection(state, TODAY)[0]).toMatchObject({ id: 'e1', title: 'Lecture', time: '10:00' })
  })

  it('includes a multi day event spanning today', () => {
    const state = { events: [{ id: 'e1', title: 'Trip', startDate: '2026-08-10', endDate: '2026-08-12' }], tasks: [] }
    expect(buildTodayProjection(state, TODAY)).toHaveLength(1)
  })

  it('excludes a multi day event that ended', () => {
    const state = { events: [{ id: 'e1', title: 'Trip', startDate: '2026-08-01', endDate: '2026-08-05' }], tasks: [] }
    expect(buildTodayProjection(state, TODAY)).toEqual([])
  })

  it('merges tasks due today', () => {
    const state = { events: [], tasks: [task()] }
    expect(buildTodayProjection(state, TODAY)).toHaveLength(1)
  })

  it('sorts all day entries before timed ones', () => {
    const state = {
      events: [
        { id: 'e1', title: 'Timed', date: TODAY, startTime: '10:00' },
        { id: 'e2', title: 'All day', date: TODAY },
      ],
      tasks: [],
    }
    expect(buildTodayProjection(state, TODAY).map(e => e.id)).toEqual(['e2', 'e1'])
  })
})

describe('kanban projection', () => {
  const state = {
    activeSemesterId: 'sem1',
    kanban: { sem1: { columns: [{ id: 'a', title: 'To Do', order: 0 }, { id: 'b', title: 'Done', order: 1 }] } },
    tasks: [
      { id: 't1', semesterId: 'sem1', views: { kanban: true }, kanban: { columnId: 'a' } },
      { id: 't2', semesterId: 'sem1', views: { kanban: true }, kanban: { columnId: 'a' } },
      { id: 't3', semesterId: 'sem1', views: { kanban: false }, kanban: { columnId: 'b' } },
    ],
  }

  it('counts cards per column', () => {
    const out = buildKanbanProjection(state)
    expect(out.map(c => ({ id: c.id, title: c.title, count: c.count }))).toEqual([
      { id: 'a', title: 'To Do', count: 2 },
      { id: 'b', title: 'Done', count: 0 },
    ])
    expect(out[0].cards.map(c => c.id)).toEqual(['t1', 't2'])
    expect(out[1].cards).toEqual([])
  })

  it('returns nothing when no board exists', () => {
    expect(buildKanbanProjection({ activeSemesterId: null, kanban: {}, tasks: [] })).toEqual([])
  })

  it('falls back to the free board with no semester', () => {
    const free = {
      ...NONE_MODE,
      activeSemesterId: null,
      kanban: { __free__: { columns: [{ id: 'a', title: 'Todo', order: 0 }] } },
      tasks: [{ id: 't1', views: { kanban: true }, kanban: { columnId: 'a' } }],
    }
    expect(buildKanbanProjection(free).map(c => ({ id: c.id, title: c.title, count: c.count })))
      .toEqual([{ id: 'a', title: 'Todo', count: 1 }])
  })

  it('uses the free board in none mode even with an active semester', () => {
    const noneWithSem = {
      ...NONE_MODE,
      activeSemesterId: 'sem1',
      kanban: { __free__: { columns: [{ id: 'a', title: 'Todo', order: 0 }] } },
      tasks: [{ id: 't1', views: { kanban: true }, kanban: { columnId: 'a' } }],
    }
    expect(buildKanbanProjection(noneWithSem).map(c => ({ id: c.id, title: c.title, count: c.count })))
      .toEqual([{ id: 'a', title: 'Todo', count: 1 }])
  })
})

describe('collab merging', () => {
  const collabState = {
    ...NONE_MODE,
    settings: { semesterMode: 'none', collabEnabled: true },
    activeSemesterId: null,
    collab: { userId: 'me', memberships: [{ teamId: 'team1' }] },
    classes: [],
    tasks: [],
    kanban: { __free__: { columns: [{ id: 'a', title: 'Todo', order: 0 }] } },
    collabRuntime: {
      teams: {
        team1: {
          state: {
            tasks: [{ id: 'r1', title: 'Shared task', doneBy: {} }],
            kanban: { cards: [{ id: 'rc1', title: 'Shared card', columnId: 'a' }] },
          },
        },
      },
    },
  }

  it('includes shared tasks from a team', () => {
    const out = buildTasksProjection(collabState, TODAY)
    expect(out.map(t => t.title)).toContain('Shared task')
  })

  it('excludes shared tasks the user has completed', () => {
    const done = {
      ...collabState,
      collabRuntime: {
        teams: {
          team1: {
            state: { tasks: [{ id: 'r1', title: 'Shared task', doneBy: { me: true } }], kanban: { cards: [] } },
          },
        },
      },
    }
    expect(buildTasksProjection(done, TODAY)).toEqual([])
  })

  it('does not treat a shared task as done when the member id is unresolved', () => {
    const unresolved = {
      ...collabState,
      collab: { userId: null, memberships: [{ teamId: 'team1' }] },
      collabRuntime: {
        teams: {
          team1: {
            state: { tasks: [{ id: 'r1', title: 'Shared task', doneBy: { me: true } }], kanban: { cards: [] } },
          },
        },
      },
    }
    expect(buildTasksProjection(unresolved, TODAY).map(t => t.title)).toContain('Shared task')
  })

  it('includes shared kanban cards', () => {
    const out = buildKanbanProjection(collabState)
    expect(out[0].cards.map(c => c.title)).toEqual(['Shared card'])
    expect(out[0].cards[0].shared).toBe(true)
  })

  it('ignores team data when collab is off', () => {
    const off = { ...collabState, settings: { semesterMode: 'none', collabEnabled: false } }
    expect(buildTasksProjection(off, TODAY)).toEqual([])
    expect(buildKanbanProjection(off)[0].cards).toEqual([])
  })
})

describe('provider events', () => {
  it('merges extra provider events into today', () => {
    const state = {
      ...NONE_MODE,
      tasks: [],
      events: [],
      widgetExtraEvents: [{ id: 'ei1', title: 'EI exam', date: TODAY }],
    }
    expect(buildTodayProjection(state, TODAY).map(e => e.title)).toEqual(['EI exam'])
  })

  it('marks provider event days on the calendar', () => {
    const state = {
      ...NONE_MODE,
      tasks: [],
      events: [],
      widgetExtraEvents: [{ id: 'ei1', title: 'EI exam', date: '2026-08-20' }],
    }
    const cal = buildCalendarProjection(state, NOW, 0)
    expect(cal.days.find(d => d && d.dayKey === '2026-08-20').count).toBe(1)
  })
})

describe('agenda projection', () => {
  it('groups entries by day and skips empty days', () => {
    const state = {
      ...NONE_MODE,
      tasks: [],
      events: [
        { id: 'e1', title: 'Today', date: TODAY, startTime: '10:00' },
        { id: 'e2', title: 'In three days', date: '2026-08-14' },
      ],
    }
    const agenda = buildAgendaProjection(state, NOW)
    expect(agenda.map(d => d.dayKey)).toEqual([TODAY, '2026-08-14'])
    expect(agenda[0].offset).toBe(0)
    expect(agenda[1].offset).toBe(3)
    expect(agenda[0].entries).toHaveLength(1)
  })

  it('ignores events beyond the agenda horizon', () => {
    const state = { ...NONE_MODE, tasks: [], events: [{ id: 'e1', title: 'Far', date: '2026-10-01' }] }
    expect(buildAgendaProjection(state, NOW)).toEqual([])
  })

  it('returns nothing without events or dated tasks', () => {
    expect(buildAgendaProjection({ ...NONE_MODE, tasks: [], events: [] }, NOW)).toEqual([])
  })
})

describe('calendar projection', () => {
  const state = {
    ...NONE_MODE,
    tasks: [task({ id: 'due', dueDate: '2026-08-20' })],
    events: [
      { id: 'e1', title: 'Gym', date: TODAY },
      { id: 'e2', title: 'Trip', startDate: '2026-08-03', endDate: '2026-08-05' },
    ],
  }

  it('lays out the month starting on Monday', () => {
    const cal = buildCalendarProjection(state, NOW, 0)
    expect(cal.year).toBe(2026)
    expect(cal.month).toBe(8)
    expect(cal.days.length % 7).toBe(0)
    expect(cal.days.slice(0, 5).every(d => d === null)).toBe(true)
    expect(cal.days[5]).toMatchObject({ day: 1 })
  })

  it('marks today', () => {
    const cal = buildCalendarProjection(state, NOW, 0)
    const today = cal.days.find(d => d && d.dayKey === TODAY)
    expect(today.today).toBe(true)
    expect(cal.days.filter(d => d && d.today)).toHaveLength(1)
  })

  it('counts events and due tasks per day', () => {
    const cal = buildCalendarProjection(state, NOW, 0)
    const byKey = k => cal.days.find(d => d && d.dayKey === k)
    expect(byKey(TODAY).count).toBe(1)
    expect(byKey('2026-08-20').count).toBe(1)
    expect(byKey('2026-08-19').count).toBe(0)
  })

  it('spans a multi day event across every covered day', () => {
    const cal = buildCalendarProjection(state, NOW, 0)
    const byKey = k => cal.days.find(d => d && d.dayKey === k)
    expect(byKey('2026-08-03').count).toBe(1)
    expect(byKey('2026-08-04').count).toBe(1)
    expect(byKey('2026-08-05').count).toBe(1)
    expect(byKey('2026-08-06').count).toBe(0)
  })

  it('shifts to another month by offset', () => {
    const prev = buildCalendarProjection(state, NOW, -1)
    const next = buildCalendarProjection(state, NOW, 1)
    expect(prev.month).toBe(7)
    expect(next.month).toBe(9)
    expect(next.days.some(d => d && d.today)).toBe(false)
  })

  it('rolls over the year boundary', () => {
    const dec = new Date('2026-12-15T09:00:00')
    expect(buildCalendarProjection(state, dec, 1)).toMatchObject({ year: 2027, month: 1 })
  })
})

describe('calendar view modes', () => {
  const state = {
    ...NONE_MODE,
    tasks: [],
    events: [
      { id: 'e1', title: 'Gym', date: TODAY, startTime: '18:00' },
      { id: 'e2', title: 'Trip', date: '2026-08-13' },
    ],
  }

  it('builds a Monday-first week with entries', () => {
    const week = buildCalendarWeekProjection(state, NOW, 0)
    expect(week.days).toHaveLength(7)
    expect(week.startKey).toBe('2026-08-10')
    expect(week.days.find(d => d.dayKey === TODAY).entries.map(e => e.title)).toEqual(['Gym'])
    expect(week.days.filter(d => d.today)).toHaveLength(1)
  })

  it('shifts the week by offset', () => {
    expect(buildCalendarWeekProjection(state, NOW, 1).startKey).toBe('2026-08-17')
    expect(buildCalendarWeekProjection(state, NOW, -1).startKey).toBe('2026-08-03')
  })

  it('builds a single day with all entries', () => {
    const day = buildCalendarDayProjection(state, NOW, 0)
    expect(day.dayKey).toBe(TODAY)
    expect(day.today).toBe(true)
    expect(day.entries.map(e => e.title)).toEqual(['Gym'])
  })

  it('shifts the day by offset', () => {
    const day = buildCalendarDayProjection(state, NOW, 2)
    expect(day.dayKey).toBe('2026-08-13')
    expect(day.today).toBe(false)
    expect(day.entries.map(e => e.title)).toEqual(['Trip'])
  })

  it('counts events per month for the year view', () => {
    const year = buildCalendarYearProjection(state, NOW, 0)
    expect(year.year).toBe(2026)
    expect(year.months).toHaveLength(12)
    expect(year.months.find(m => m.month === 8).count).toBe(2)
    expect(year.currentMonth).toBe(8)
  })

  it('includes day entries in the month grid', () => {
    const month = buildCalendarProjection(state, NOW, 0)
    const today = month.days.find(d => d && d.dayKey === TODAY)
    expect(today.entries.map(e => e.title)).toEqual(['Gym'])
  })
})

describe('pomodoro projection', () => {
  const on = { settings: { pomodoro: { enabled: true, resetPeriod: 'week' } } }

  it('reports disabled when the app is off', () => {
    const out = buildPomodoroProjection({ settings: { pomodoro: { enabled: false } }, pomodoros: [] }, NOW)
    expect(out.enabled).toBe(false)
    expect(out.tomatoes).toEqual([])
  })

  it('counts completed and abandoned sessions', () => {
    const state = {
      ...on,
      pomodoros: [
        { createdAt: Date.now(), pct: 1 },
        { createdAt: Date.now(), pct: 0.4, abandoned: true },
      ],
    }
    const out = buildPomodoroProjection(state, NOW)
    expect(out.enabled).toBe(true)
    expect(out.completed).toBe(1)
    expect(out.abandoned).toBe(1)
    expect(out.tomatoes).toHaveLength(2)
    expect(out.tomatoes[1].abandoned).toBe(true)
  })

  it('returns no tomatoes with no sessions', () => {
    expect(buildPomodoroProjection({ ...on, pomodoros: [] }, NOW).tomatoes).toEqual([])
  })
})

describe('habits projection', () => {
  const habit = (over = {}) => ({
    id: 'g1', title: 'Run', cadenceDays: 1, weekdays: [], checkIns: {},
    createdAt: new Date('2026-08-01').getTime(), targetKind: 'endless', ...over,
  })

  it('marks a habit pending when not checked in', () => {
    const out = buildHabitsProjection({ ...HABITS_ON, habits: [habit()] }, NOW)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ id: 'g1', title: 'Run', done: false })
  })

  it('marks a habit done when checked in for the period', () => {
    const out = buildHabitsProjection({ ...HABITS_ON, habits: [habit({ checkIns: { [TODAY]: { note: '' } } })] }, NOW)
    expect(out[0].done).toBe(true)
  })

  it('skips rest days on a custom cadence', () => {
    const restToday = habit({ cadenceDays: 'custom', weekdays: [0] })
    expect(buildHabitsProjection({ ...HABITS_ON, habits: [restToday] }, NOW)).toEqual([])
  })

  it('keeps an active weekday on a custom cadence', () => {
    const activeToday = habit({ cadenceDays: 'custom', weekdays: [2] })
    expect(buildHabitsProjection({ ...HABITS_ON, habits: [activeToday] }, NOW)).toHaveLength(1)
  })

  it('returns nothing without habits', () => {
    expect(buildHabitsProjection({}, NOW)).toEqual([])
  })
})

describe('summary projection', () => {
  it('counts overdue, due today and pending habits', () => {
    const state = { ...NONE_MODE, tasks: [task({ id: 'a' }), task({ id: 'b', dueDate: '2026-07-01' })] }
    const tasks = buildTasksProjection(state, TODAY)
    const summary = buildSummaryProjection(state, TODAY, tasks, [], [{ done: false }, { done: true }])
    expect(summary).toMatchObject({
      overdue: 1, dueToday: 1, tasksOpen: 2, eventsToday: 0, habitsPending: 1,
    })
  })
})

describe('buildProjection', () => {
  it('stamps a version and day key', () => {
    const out = buildProjection({ ...NONE_MODE, tasks: [], events: [], classes: [], kanban: {} }, NOW)
    expect(out.version).toBe(1)
    expect(out.dayKey).toBe(TODAY)
  })

  it('produces the same shape as the empty projection', () => {
    const built = buildProjection({ ...NONE_MODE, tasks: [], events: [], classes: [], kanban: {} }, NOW)
    expect(Object.keys(built).sort()).toEqual(Object.keys(emptyProjection(NOW)).sort())
  })
})
