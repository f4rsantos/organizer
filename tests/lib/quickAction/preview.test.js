import { describe, it, expect } from 'vitest'
import { previewQuickAction } from '../../../src/lib/quickAction/preview.js'
import { en } from '../../../src/lib/strings/en.js'

const NOW = new Date('2026-10-18T12:00:00')

function ctxWith({ tasks = [], classes = [], columns = [], habits = [], apps = {} } = {}) {
  const state = { tasks, habits, settings: { apps } }
  return { t: en, now: NOW, classes, columns, read: () => state, tasks: () => tasks }
}

describe('quick action preview', () => {
  it('shows the due date, time and class a new task will get', () => {
    const classes = [{ id: 'c1', name: 'Physics', color: '#f00' }]
    const [row] = previewQuickAction([
      { kind: 'task', title: 'Lab', date: '2026-10-19', startTime: '15:00', endTime: '16:00', classId: 'c1', priority: 1 },
    ], ctxWith({ classes }))
    expect(row.title).toBe('Lab')
    expect(row.chips).toEqual(['Tomorrow', '15:00–16:00', 'Physics', 'P1'])
  })

  it('names the existing task a mutation will change before it runs', () => {
    const [row] = previewQuickAction(
      [{ kind: 'mutation', action: 'complete', query: 'lab report' }],
      ctxWith({ tasks: [{ id: 't1', title: 'Lab report' }] }),
    )
    expect(row).toMatchObject({ kind: 'mutation', action: 'complete', title: 'Lab report', missing: false })
  })

  it('warns when a mutation matches nothing', () => {
    const [row] = previewQuickAction(
      [{ kind: 'mutation', action: 'delete', query: 'gym' }],
      ctxWith({ tasks: [{ id: 't1', title: 'Essay' }] }),
    )
    expect(row.missing).toBe(true)
  })

  it('shows the target column of a new kanban card', () => {
    const columns = [{ id: 'todo', title: 'To Do' }, { id: 'doing', title: 'Doing' }]
    const [row] = previewQuickAction([{ kind: 'kanbanCard', title: 'Slides', columnId: 'doing' }], ctxWith({ columns }))
    expect(row.chips).toEqual(['Doing'])
  })

  it('labels a weekday date within the coming week by its weekday name', () => {
    const [row] = previewQuickAction([{ kind: 'event', title: 'Dentist', date: '2026-10-23' }], ctxWith())
    expect(row.chips[0]).toBe('Friday')
  })
})
