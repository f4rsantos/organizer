import { describe, it, expect } from 'vitest'
import { upcomingTaskNotifications } from '@/lib/notifications/upcoming'

describe('upcomingTaskNotifications', () => {
  it('maps upcoming task reminders into notification entries', () => {
    const now = new Date('2026-01-01T00:00:00').getTime()
    const dueDate = '2026-01-10'
    const tasks = [{ id: 't1', title: 'Essay', dueDate, done: false }]
    const result = upcomingTaskNotifications({ tasks, offsets: [1], time: '09:00', now })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ source: 'task', title: 'Essay' })
    expect(result[0].timestamp).toBeGreaterThan(now)
  })

  it('excludes done tasks via the isDone predicate', () => {
    const now = Date.now()
    const tasks = [{ id: 't1', title: 'Essay', dueDate: '2099-01-10', done: true }]
    const result = upcomingTaskNotifications({ tasks, offsets: [1], time: '09:00', now, isDone: t => t.done })
    expect(result).toEqual([])
  })

  it('respects the limit', () => {
    const now = Date.now()
    const tasks = Array.from({ length: 5 }, (_, i) => ({ id: `t${i}`, title: `Task ${i}`, dueDate: '2099-01-10', done: false }))
    const result = upcomingTaskNotifications({ tasks, offsets: [1, 2], time: '09:00', now, limit: 3 })
    expect(result).toHaveLength(3)
  })
})
