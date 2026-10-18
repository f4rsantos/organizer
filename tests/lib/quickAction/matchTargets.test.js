import { describe, it, expect } from 'vitest'
import { findBestTask, findBestHabit } from '../../../src/lib/quickAction/matchTargets.js'
import { currentPeriodKey } from '../../../src/lib/habits.js'

const NOW = new Date('2026-10-18T12:00:00')

describe('finding the task a command refers to', () => {
  it('picks the task sharing the most words with the query', () => {
    const tasks = [
      { id: 'a', title: 'Read chapter' },
      { id: 'b', title: 'Read chapter 4 physics' },
    ]
    expect(findBestTask(tasks, 'chapter 4 physics', NOW).id).toBe('b')
  })

  it('ignores tasks that are already done', () => {
    const tasks = [{ id: 'a', title: 'Essay', done: true }, { id: 'b', title: 'Essay draft' }]
    expect(findBestTask(tasks, 'essay', NOW).id).toBe('b')
  })

  it('prefers the copy due this week over one due next month', () => {
    const tasks = [
      { id: 'later', title: 'Lab report', dueDate: '2026-11-20' },
      { id: 'soon', title: 'Lab report', dueDate: '2026-10-21' },
    ]
    expect(findBestTask(tasks, 'lab report', NOW).id).toBe('soon')
  })

  it('matches words regardless of case', () => {
    expect(findBestTask([{ id: 'a', title: 'Calculus Homework' }], 'calculus homework', NOW).id).toBe('a')
  })

  it('finds nothing when no word overlaps', () => {
    expect(findBestTask([{ id: 'a', title: 'Essay' }], 'gym', NOW)).toBe(null)
  })
})

describe('finding the habit a command refers to', () => {
  it('prefers a habit still open for check-in today', () => {
    const base = { title: 'Run', cadenceDays: 1, createdAt: '2026-10-01' }
    const todayKey = currentPeriodKey(base, NOW)
    const habits = [
      { ...base, id: 'done', checkIns: { [todayKey]: { at: 1 } } },
      { ...base, id: 'open', checkIns: {} },
    ]
    expect(findBestHabit(habits, 'run', NOW).id).toBe('open')
  })
})
