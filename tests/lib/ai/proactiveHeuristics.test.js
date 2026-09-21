import { describe, it, expect } from 'vitest'
import {
  taskAddedNoDueDate,
  taskUpdatedLostDueDate,
  kanbanCardMovedToDoneColumn,
  eventAddedNoReminder,
  gradeComponentMissingWeight,
  appOpenedOverdueTasks,
  evaluateProactiveHeuristic,
  PROACTIVE_TRIGGER_ACTIONS,
} from '../../../src/lib/ai/proactiveHeuristics'

describe('taskAddedNoDueDate', () => {
  it('flags a task with no due date', () => {
    const result = taskAddedNoDueDate({ id: 't1', title: 'Essay', dueDate: null, done: false })
    expect(result).toEqual({ kind: 'task-no-due-date', entityId: 't1', title: 'Essay' })
  })

  it('does not flag a task with a due date', () => {
    expect(taskAddedNoDueDate({ id: 't1', dueDate: '2026-09-20', done: false })).toBeNull()
  })

  it('does not flag a task already done', () => {
    expect(taskAddedNoDueDate({ id: 't1', dueDate: null, done: true })).toBeNull()
  })

  it('handles a missing task', () => {
    expect(taskAddedNoDueDate(null)).toBeNull()
  })
})

describe('taskUpdatedLostDueDate', () => {
  it('flags when a due date is cleared', () => {
    const prev = { id: 't1', dueDate: '2026-09-20', done: false }
    const next = { id: 't1', dueDate: null, done: false }
    expect(taskUpdatedLostDueDate(prev, next)).toEqual({ kind: 'task-due-date-removed', entityId: 't1', title: '' })
  })

  it('does not flag when the due date is unchanged', () => {
    const prev = { id: 't1', dueDate: '2026-09-20', done: false }
    const next = { id: 't1', dueDate: '2026-09-21', done: false }
    expect(taskUpdatedLostDueDate(prev, next)).toBeNull()
  })

  it('does not flag when the task is now done', () => {
    const prev = { id: 't1', dueDate: '2026-09-20', done: false }
    const next = { id: 't1', dueDate: null, done: true }
    expect(taskUpdatedLostDueDate(prev, next)).toBeNull()
  })
})

describe('kanbanCardMovedToDoneColumn', () => {
  const columns = [
    { id: 'col_todo', title: 'To Do', order: 0 },
    { id: 'col_doing', title: 'Doing', order: 1 },
    { id: 'col_done', title: 'Done', order: 2 },
  ]

  it('flags a card moved to a done-named column with open checklist items', () => {
    const task = { id: 'c1', title: 'Ship it', kanban: { checklist: [{ id: '1', done: false }] } }
    const result = kanbanCardMovedToDoneColumn({ task, targetColumnId: 'col_done', columns })
    expect(result).toEqual({ kind: 'kanban-card-done-with-open-checklist', entityId: 'c1', title: 'Ship it' })
  })

  it('flags a card moved to the last column even if not named "done"', () => {
    const customColumns = [
      { id: 'a', title: 'Backlog', order: 0 },
      { id: 'b', title: 'Shipped', order: 1 },
    ]
    const task = { id: 'c1', title: 'X', kanban: { checklist: [{ id: '1', done: false }] } }
    const result = kanbanCardMovedToDoneColumn({ task, targetColumnId: 'b', columns: customColumns })
    expect(result?.kind).toBe('kanban-card-done-with-open-checklist')
  })

  it('does not flag when checklist is fully done', () => {
    const task = { id: 'c1', title: 'Ship it', kanban: { checklist: [{ id: '1', done: true }] } }
    expect(kanbanCardMovedToDoneColumn({ task, targetColumnId: 'col_done', columns })).toBeNull()
  })

  it('does not flag a move to a non-done column', () => {
    const task = { id: 'c1', title: 'X', kanban: { checklist: [{ id: '1', done: false }] } }
    expect(kanbanCardMovedToDoneColumn({ task, targetColumnId: 'col_doing', columns })).toBeNull()
  })
})

describe('eventAddedNoReminder', () => {
  it('flags an event with a date and no reminder', () => {
    const event = { id: 'e1', title: 'Exam', date: '2026-10-01', reminderOffsetHours: null }
    expect(eventAddedNoReminder(event)).toEqual({ kind: 'event-no-reminder', entityId: 'e1', title: 'Exam' })
  })

  it('does not flag an event that already has a reminder', () => {
    const event = { id: 'e1', date: '2026-10-01', reminderOffsetHours: 3 }
    expect(eventAddedNoReminder(event)).toBeNull()
  })

  it('does not flag an event without a date', () => {
    expect(eventAddedNoReminder({ id: 'e1', reminderOffsetHours: null })).toBeNull()
  })
})

describe('gradeComponentMissingWeight', () => {
  it('flags a component with no weight', () => {
    expect(gradeComponentMissingWeight({ id: 'g1', name: 'Midterm', weight: null }))
      .toEqual({ kind: 'grade-component-no-weight', entityId: 'g1', title: 'Midterm' })
  })

  it('does not flag a component with a positive weight', () => {
    expect(gradeComponentMissingWeight({ id: 'g1', weight: 30 })).toBeNull()
  })
})

describe('appOpenedOverdueTasks', () => {
  const now = new Date('2026-09-20T00:00:00.000Z')

  it('flags when there are overdue, undone tasks', () => {
    const tasks = [{ id: 't1', dueDate: '2026-09-01', done: false }]
    expect(appOpenedOverdueTasks(tasks, now)).toEqual({
      kind: 'app-open-overdue-tasks', entityId: null, title: '', count: 1,
    })
  })

  it('does not flag when overdue tasks are done', () => {
    const tasks = [{ id: 't1', dueDate: '2026-09-01', done: true }]
    expect(appOpenedOverdueTasks(tasks, now)).toBeNull()
  })

  it('does not flag when nothing is overdue', () => {
    const tasks = [{ id: 't1', dueDate: '2026-10-01', done: false }]
    expect(appOpenedOverdueTasks(tasks, now)).toBeNull()
  })
})

describe('evaluateProactiveHeuristic', () => {
  it('dispatches addTask to taskAddedNoDueDate', () => {
    const context = { args: [{ id: 't1', dueDate: null, done: false }], prevState: {}, nextState: {} }
    expect(evaluateProactiveHeuristic('addTask', context)?.kind).toBe('task-no-due-date')
  })

  it('returns null for an unknown trigger', () => {
    expect(evaluateProactiveHeuristic('deleteTask', {})).toBeNull()
  })

  it('exposes the known trigger action names', () => {
    expect(PROACTIVE_TRIGGER_ACTIONS).toEqual(expect.arrayContaining([
      'addTask', 'updateTask', 'addKanbanCard', 'moveKanbanCard', 'addEvent', 'setGradeComponents',
    ]))
  })

  it('dispatches addKanbanCard to taskAddedNoDueDate for the newly added task', () => {
    const context = {
      args: [],
      prevState: { tasks: [] },
      nextState: { tasks: [{ id: 'c1', title: 'Card', dueDate: null, done: false }] },
    }
    expect(evaluateProactiveHeuristic('addKanbanCard', context)?.kind).toBe('task-no-due-date')
  })

  it('dispatches setGradeComponents to gradeComponentMissingWeight for the last component', () => {
    const context = { args: ['sem1', 'class1', [{ id: 'g1', name: 'Final', weight: null }]] }
    expect(evaluateProactiveHeuristic('setGradeComponents', context)?.kind).toBe('grade-component-no-weight')
  })
})
