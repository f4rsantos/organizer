import { describe, it, expect } from 'vitest'
import { expandRecurringTask, expandTasksForRange } from '../../src/lib/recurrence'

const RANGE_START = new Date(2026, 0, 5)
const RANGE_END = new Date(2026, 0, 25)

describe('expandRecurringTask', () => {
  it('repeats weekly from the due date', () => {
    const task = { id: 't1', dueDate: '2026-01-05', recurrence: { freq: 'weekly', interval: 1, until: null } }
    const dates = expandRecurringTask(task, RANGE_START, RANGE_END).map(o => o.dueDate)
    expect(dates).toEqual(['2026-01-05', '2026-01-12', '2026-01-19'])
  })

  it('anchors to the range start when there is no due date', () => {
    const task = { id: 't2', dueDate: null, recurrence: { freq: 'weekly', interval: 1, until: null } }
    const dates = expandRecurringTask(task, RANGE_START, RANGE_END).map(o => o.dueDate)
    expect(dates).toEqual(['2026-01-05', '2026-01-12', '2026-01-19'])
  })

  it('stops at the until date', () => {
    const task = { id: 't3', dueDate: '2026-01-05', recurrence: { freq: 'weekly', interval: 1, until: '2026-01-13' } }
    const dates = expandRecurringTask(task, RANGE_START, RANGE_END).map(o => o.dueDate)
    expect(dates).toEqual(['2026-01-05', '2026-01-12'])
  })

  it('honours the interval', () => {
    const task = { id: 't4', dueDate: '2026-01-05', recurrence: { freq: 'weekly', interval: 2, until: null } }
    const dates = expandRecurringTask(task, RANGE_START, RANGE_END).map(o => o.dueDate)
    expect(dates).toEqual(['2026-01-05', '2026-01-19'])
  })

  it('leaves non-recurring tasks untouched', () => {
    const task = { id: 't5', dueDate: '2026-01-05', recurrence: null }
    expect(expandTasksForRange([task], RANGE_START, RANGE_END)).toEqual([task])
  })
})
