import { describe, it, expect } from 'vitest'
import { parseQuickAction } from './quickActionParse.js'
import { en as enStrings } from '../strings/en.js'

const NOW = new Date(2026, 6, 15)

const CLASSES = [{ id: 'c1', name: 'calculus' }]
const COLUMNS = [{ id: 'col1', title: 'todo' }, { id: 'col2', title: 'doing' }]
const TEAMS = { t1: { name: 'study group' } }

function run(raw, overrides = {}) {
  return parseQuickAction(raw, {
    now: NOW,
    lang: 'en',
    t: enStrings,
    classes: CLASSES,
    columns: COLUMNS,
    teams: TEAMS,
    apps: { notes: true },
    ...overrides,
  })
}

describe('kind detection', () => {
  it('defaults to a task', () => {
    const [item] = run('add buy milk')
    expect(item.kind).toBe('task')
    expect(item.title).toBe('buy milk')
  })

  it('detects an explicit event', () => {
    expect(run('add calendar event standup')[0].kind).toBe('event')
  })

  it('detects a kanban card and assigns a column', () => {
    const [item] = run('add kanban card refactor')
    expect(item.kind).toBe('kanbanCard')
    expect(item.columnId).toBe('col1')
  })

  it('routes a card to a named column', () => {
    expect(run('add card refactor on doing')[0].columnId).toBe('col2')
  })

  it('flags a task that is also an event', () => {
    const [item] = run('add task and calendar event standup')
    expect(item.kind).toBe('task')
    expect(item.showOnCalendar).toBe(true)
  })
})

describe('field extraction', () => {
  it('pulls date, time and class off a single clause', () => {
    const [item] = run('add task essay for calculus tomorrow at 3pm')
    expect(item.title).toBe('essay')
    expect(item.date).toBe('2026-07-16')
    expect(item.startTime).toBe('15:00')
    expect(item.classId).toBe('c1')
  })

  it('routes a task to a class with "to"', () => {
    const [item] = run('add task ppt 1 to calculus')
    expect(item.title).toBe('ppt 1')
    expect(item.classId).toBe('c1')
  })

  it('pulls a time range', () => {
    const [item] = run('add calendar event lecture 15h-17h')
    expect(item.startTime).toBe('15:00')
    expect(item.endTime).toBe('17:00')
  })

  it('pulls recurrence and priority', () => {
    const [item] = run('add task gym every monday high priority')
    expect(item.recurrence).toEqual({ freq: 'weekly', interval: 1, weekday: 1 })
    expect(item.priority).toBe(1)
  })
})

describe('clause splitting', () => {
  it('splits on a comma before a second add verb', () => {
    const items = run('add task one, add task two')
    expect(items).toHaveLength(2)
    expect(items.map(i => i.title)).toEqual(['one', 'two'])
  })

  it('splits on "and" before a second add verb', () => {
    const items = run('add task one and add task two')
    expect(items).toHaveLength(2)
  })
})

describe('multiple items', () => {
  it('splits a plural list', () => {
    const items = run('add tasks alpha, beta, gamma')
    expect(items).toHaveLength(3)
    expect(items.map(i => i.title)).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('carries a prefix onto bare enumerators', () => {
    const items = run('add tasks ppt 1, 2, 3')
    expect(items.map(i => i.title)).toEqual(['ppt 1', 'ppt 2', 'ppt 3'])
  })

  it('does not carry a prefix across distinct nouns', () => {
    const items = run('add tasks ppt 1, video 2')
    expect(items.map(i => i.title)).toEqual(['ppt 1', 'video 2'])
  })

  it('maps dates positionally with "respectively"', () => {
    const items = run('add tasks alpha and beta for tomorrow and 18/07 respectively')
    expect(items).toHaveLength(2)
    expect(items[0].date).toBe('2026-07-16')
    expect(items[1].date).toBe('2026-07-18')
  })

  it('maps dates with ordinal "first for / second for" phrasing', () => {
    const items = run('add tasks alpha and beta, first for tomorrow, second for 18/07')
    expect(items).toHaveLength(2)
    expect(items[0].date).toBe('2026-07-16')
    expect(items[1].date).toBe('2026-07-18')
  })
})

describe('mutation guard', () => {
  it('treats a delete-led phrase as a mutation, not a new task', () => {
    const [item] = run('delete groceries')
    expect(item.kind).toBe('mutation')
    expect(item.action).toBe('delete')
    expect(item.query).toBe('groceries')
  })

  it('strips the noun from a mutation query', () => {
    const [item] = run('delete task groceries')
    expect(item.kind).toBe('mutation')
    expect(item.query).toBe('groceries')
  })

  it('does not fire on an explicit add', () => {
    expect(run('add task groceries')[0].kind).toBe('task')
  })

  it('carries a team onto a share mutation', () => {
    const [item] = run('share notes with study group')
    expect(item.kind).toBe('mutation')
    expect(item.action).toBe('share')
    expect(item.teamId).toBe('t1')
  })
})

describe('navigation', () => {
  it('returns a navigation result', () => {
    const [item] = run('open settings')
    expect(item.kind).toBe('navigation')
    expect(item.target).toBe('settings')
  })
})

describe('focus commands', () => {
  it('starts a focus session with durations', () => {
    const [item] = run('start focus 20m 5m break')
    expect(item.kind).toBe('focus')
    expect(item.action).toBe('start')
    expect(item.workMins).toBe(20)
    expect(item.breakMins).toBe(5)
  })

  it('pauses a focus session', () => {
    const [item] = run('stop focus')
    expect(item.kind).toBe('focus')
    expect(item.action).toBe('pause')
  })

  it('skips a break', () => {
    expect(run('skip break')[0].action).toBe('skipBreak')
  })
})

describe('note commands', () => {
  it('adds a note', () => {
    const [item] = run('add note ideas')
    expect(item.kind).toBe('noteAction')
    expect(item.type).toBe('addNote')
    expect(item.title).toBe('ideas')
  })

  it('adds a folder', () => {
    const [item] = run('add folder semester one')
    expect(item.type).toBe('addFolder')
  })

  it('stays out of the way when the notes app is off', () => {
    const [item] = run('add note ideas', { apps: {} })
    expect(item.kind).toBe('task')
  })

  it('survives regex metacharacters in the title', () => {
    expect(() => run('add note budget (2026)')).not.toThrow()
    expect(run('add note budget (2026)')[0].kind).toBe('noteAction')
  })

  it('adds a note in a non-English locale', () => {
    const [item] = run('adicionar nota ideias', { lang: 'pt' })
    expect(item.kind).toBe('noteAction')
    expect(item.type).toBe('addNote')
  })
})

describe('grade commands', () => {
  it('sets a grade', () => {
    const [item] = run('grade 15 in midterm for calculus')
    expect(item.kind).toBe('gradeAction')
    expect(item.type).toBe('setGrade')
    expect(item.classId).toBe('c1')
    expect(item.componentName).toBe('midterm')
    expect(item.grade).toBe(15)
  })

  it('adds a weighted component', () => {
    const [item] = run('add component final to calculus weight 30%')
    expect(item.type).toBe('addComponent')
    expect(item.classId).toBe('c1')
    expect(item.componentName).toBe('final')
    expect(item.weight).toBeCloseTo(0.3)
  })

  it('sets a grade in a non-English locale', () => {
    const [item] = run('nota 15 em midterm para calculus', { lang: 'pt' })
    expect(item.kind).toBe('gradeAction')
    expect(item.type).toBe('setGrade')
    expect(item.grade).toBe(15)
  })
})

describe('edge cases', () => {
  it('returns nothing for empty input', () => {
    expect(run('')).toEqual([])
    expect(run('   ')).toEqual([])
  })
})
