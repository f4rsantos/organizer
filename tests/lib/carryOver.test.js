import { describe, it, expect } from 'vitest'
import { tasksForWeekWithCarryOver } from '../../src/lib/taskUtils.js'

function makeTask(overrides = {}) {
  return { id: 't1', done: false, weekStart: 2, weekEnd: 3, ...overrides }
}

describe('tasksForWeekWithCarryOver', () => {
  it('keeps an unfinished carry-over task in later weeks up to the current week, flagged as carried over', () => {
    const result = tasksForWeekWithCarryOver([makeTask()], 5, { carryOver: true, currentWeek: 6 })
    expect(result).toHaveLength(1)
    expect(result[0].carriedOver).toBe(true)
  })

  it('does not flag the task in its own weeks', () => {
    const result = tasksForWeekWithCarryOver([makeTask()], 3, { carryOver: true, currentWeek: 6 })
    expect(result).toHaveLength(1)
    expect(result[0].carriedOver).toBeUndefined()
  })

  it('keeps a finished task as completed in the weeks up to the week it was finished', () => {
    const task = makeTask({ done: true, doneWeek: 5 })
    const options = { carryOver: true, currentWeek: 8 }
    expect(tasksForWeekWithCarryOver([task], 4, options)).toHaveLength(1)
    expect(tasksForWeekWithCarryOver([task], 5, options)).toHaveLength(1)
    expect(tasksForWeekWithCarryOver([task], 6, options)).toHaveLength(0)
  })

  it('does not carry a finished task whose finishing week is unknown', () => {
    expect(tasksForWeekWithCarryOver([makeTask({ done: true })], 5, { carryOver: true, currentWeek: 6 })).toHaveLength(0)
  })

  it('does not carry into weeks after the current week', () => {
    expect(tasksForWeekWithCarryOver([makeTask()], 7, { carryOver: true, currentWeek: 6 })).toHaveLength(0)
  })

  it('does not carry anything while the setting is off', () => {
    expect(tasksForWeekWithCarryOver([makeTask()], 5, { carryOver: false, currentWeek: 6 })).toHaveLength(0)
  })

  it('does not carry into weeks before the task', () => {
    expect(tasksForWeekWithCarryOver([makeTask()], 1, { carryOver: true, currentWeek: 6 })).toHaveLength(0)
  })
})
