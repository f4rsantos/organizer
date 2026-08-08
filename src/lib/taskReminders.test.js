import { describe, it, expect } from 'vitest'
import {
  computeReminderMoments,
  dueOffsetReminders,
  dueDateToKey,
  offsetStateKey,
  upcomingScheduledReminders,
} from './taskReminders.js'

const OFFSETS = [21, 7, 2, 1, 0]

function makeTask(overrides = {}) {
  return {
    id: 't1',
    title: 'Essay',
    done: false,
    dueDate: '2026-03-20',
    ...overrides,
  }
}

describe('dueDateToKey', () => {
  it('accepts plain dates, ISO timestamps and Date objects', () => {
    expect(dueDateToKey('2026-03-20')).toBe('2026-03-20')
    expect(dueDateToKey('2026-03-20T15:04:05.000Z')).toBe('2026-03-20')
    expect(dueDateToKey(new Date('2026-03-20T09:00:00'))).toBe('2026-03-20')
  })

  it('rejects junk', () => {
    expect(dueDateToKey(null)).toBeNull()
    expect(dueDateToKey('')).toBeNull()
    expect(dueDateToKey('not a date')).toBeNull()
  })
})

describe('computeReminderMoments', () => {
  it('produces one moment per offset at the configured time', () => {
    const moments = computeReminderMoments({ task: makeTask(), offsets: OFFSETS, time: '09:00' })
    expect(moments).toHaveLength(5)

    const byOffset = Object.fromEntries(moments.map(m => [m.offset, new Date(m.timestamp)]))
    expect(byOffset[0].getDate()).toBe(20)
    expect(byOffset[1].getDate()).toBe(19)
    expect(byOffset[2].getDate()).toBe(18)
    expect(byOffset[7].getDate()).toBe(13)
    expect(byOffset[21].getMonth()).toBe(1)
    expect(byOffset[0].getHours()).toBe(9)
  })

  it('is sorted earliest first and tagged uniquely per offset', () => {
    const moments = computeReminderMoments({ task: makeTask(), offsets: OFFSETS, time: '09:00' })
    const timestamps = moments.map(m => m.timestamp)
    expect([...timestamps].sort((a, b) => a - b)).toEqual(timestamps)
    expect(new Set(moments.map(m => m.tag)).size).toBe(5)
  })

  it('returns nothing without a usable due date', () => {
    expect(computeReminderMoments({ task: makeTask({ dueDate: null }), offsets: OFFSETS, time: '09:00' })).toEqual([])
    expect(computeReminderMoments({ task: makeTask({ dueDate: 'junk' }), offsets: OFFSETS, time: '09:00' })).toEqual([])
  })

  it('dedupes offsets and drops negative ones', () => {
    const moments = computeReminderMoments({ task: makeTask(), offsets: [7, 7, -3], time: '09:00' })
    expect(moments.map(m => m.offset)).toEqual([7])
  })

  it('falls back to 09:00 when the time is unusable', () => {
    const [first] = computeReminderMoments({ task: makeTask(), offsets: [0], time: 'nope' })
    expect(new Date(first.timestamp).getHours()).toBe(9)
  })
})

describe('dueOffsetReminders', () => {
  const now = new Date('2026-03-19T12:00:00').getTime()

  it('returns only offsets whose moment has passed', () => {
    const fired = dueOffsetReminders({ tasks: [makeTask()], offsets: OFFSETS, time: '09:00', now })
    expect(fired.map(m => m.offset)).toEqual([1, 2, 7, 21])
  })

  it('skips offsets already acknowledged', () => {
    const alertStates = { [offsetStateKey('t1', '2026-03-20', 1)]: { hidden: true } }
    const fired = dueOffsetReminders({ tasks: [makeTask()], offsets: OFFSETS, time: '09:00', now, alertStates })
    expect(fired.map(m => m.offset)).toEqual([2, 7, 21])
  })

  it('ignores tasks without a due date and done tasks', () => {
    const tasks = [
      makeTask({ id: 'nodue', dueDate: null }),
      makeTask({ id: 'done', done: true }),
      makeTask({ id: 'on' }),
    ]
    const fired = dueOffsetReminders({ tasks, offsets: OFFSETS, time: '09:00', now })
    expect(new Set(fired.map(m => m.taskId))).toEqual(new Set(['on']))
  })

  it('ignores week-scheduled tasks that carry no calendar due date', () => {
    const weekOnly = { id: 'wk', title: 'Weekly reading', done: false, dueDate: null, weekStart: 3, weekEnd: 3 }
    const fired = dueOffsetReminders({ tasks: [weekOnly], offsets: OFFSETS, time: '09:00', now })
    expect(fired).toEqual([])
    expect(upcomingScheduledReminders({ tasks: [weekOnly], offsets: OFFSETS, time: '09:00', now })).toEqual([])
  })

  it('ignores tasks whose due date is an empty string', () => {
    const blank = makeTask({ id: 'blank', dueDate: '' })
    expect(dueOffsetReminders({ tasks: [blank], offsets: OFFSETS, time: '09:00', now })).toEqual([])
  })

  it('covers every task with a due date, no opt-in needed', () => {
    const tasks = [makeTask({ id: 'a' }), makeTask({ id: 'b' })]
    const fired = dueOffsetReminders({ tasks, offsets: OFFSETS, time: '09:00', now })
    expect(new Set(fired.map(m => m.taskId))).toEqual(new Set(['a', 'b']))
  })

  it('honours a custom done predicate for shared tasks', () => {
    const tasks = [makeTask({ id: 'shared', done: false })]
    const fired = dueOffsetReminders({
      tasks, offsets: OFFSETS, time: '09:00', now, isDone: () => true,
    })
    expect(fired).toEqual([])
  })

  it('tolerates junk entries', () => {
    const fired = dueOffsetReminders({
      tasks: [null, {}, makeTask()], offsets: OFFSETS, time: '09:00', now,
    })
    expect(fired.every(m => m.taskId === 't1')).toBe(true)
  })
})

describe('upcomingScheduledReminders', () => {
  const now = new Date('2026-03-19T12:00:00').getTime()

  it('returns only future moments, earliest first', () => {
    const upcoming = upcomingScheduledReminders({ tasks: [makeTask()], offsets: OFFSETS, time: '09:00', now })
    expect(upcoming.map(m => m.offset)).toEqual([0])
    expect(upcoming[0].timestamp).toBeGreaterThan(now)
  })

  it('caps the number of scheduled reminders', () => {
    const tasks = Array.from({ length: 20 }, (_, i) => makeTask({ id: `t${i}`, dueDate: '2026-06-20' }))
    const upcoming = upcomingScheduledReminders({ tasks, offsets: OFFSETS, time: '09:00', now, limit: 30 })
    expect(upcoming).toHaveLength(30)
  })
})
