import { describe, it, expect, vi } from 'vitest'
import {
  replayOps, isValidOp, OP_SET_TASK_DONE, OP_MOVE_CARD, OP_SET_GOAL_CHECKIN, OP_SET_FOCUS_RUNNING,
} from './mutations.js'
import { currentPeriodKey } from '@/lib/goals'

const NOW = 1_700_000_000_000

function stateWith(tasks, columns = ['col_todo', 'col_done']) {
  return {
    tasks,
    kanban: { sem1: { columns: columns.map((id, i) => ({ id, title: id, order: i })) } },
  }
}

function task(over = {}) {
  return { id: 't1', title: 'Task', done: false, semesterId: 'sem1', ...over }
}

function stubActions() {
  return {
    setTaskDone: vi.fn(),
    moveKanbanCard: vi.fn(),
    checkInGoal: vi.fn(),
    undoGoalCheckIn: vi.fn(),
    setFocusSync: vi.fn(),
  }
}

function goal(over = {}) {
  return {
    id: 'g1', title: 'Run', cadenceDays: 1, weekdays: [], checkIns: {},
    createdAt: NOW - 86400000 * 5, targetKind: 'endless', ...over,
  }
}

describe('isValidOp', () => {
  it('rejects an op with no id', () => {
    expect(isValidOp({ type: OP_SET_TASK_DONE, done: true, ts: NOW })).toBe(false)
  })

  it('rejects an op with no timestamp', () => {
    expect(isValidOp({ id: 't1', type: OP_SET_TASK_DONE, done: true })).toBe(false)
  })

  it('rejects an unknown op type', () => {
    expect(isValidOp({ id: 't1', type: 'deleteEverything', ts: NOW })).toBe(false)
  })

  it('rejects setTaskDone without a boolean', () => {
    expect(isValidOp({ id: 't1', type: OP_SET_TASK_DONE, done: 'yes', ts: NOW })).toBe(false)
  })

  it('accepts a well formed op', () => {
    expect(isValidOp({ id: 't1', type: OP_SET_TASK_DONE, done: true, ts: NOW })).toBe(true)
  })
})

describe('replayOps setTaskDone', () => {
  it('applies a completion queued while the app was closed', () => {
    const state = stateWith([task()])
    const actions = stubActions()
    const applied = replayOps([{ id: 't1', type: OP_SET_TASK_DONE, done: true, ts: NOW }], actions, () => state)
    expect(applied).toBe(1)
    expect(actions.setTaskDone).toHaveBeenCalledWith('t1', true)
  })

  it('is idempotent when the task already matches', () => {
    const state = stateWith([task({ done: true })])
    const actions = stubActions()
    const applied = replayOps([{ id: 't1', type: OP_SET_TASK_DONE, done: true, ts: NOW }], actions, () => state)
    expect(applied).toBe(0)
    expect(actions.setTaskDone).not.toHaveBeenCalled()
  })

  it('drops an op for a task deleted since it was queued', () => {
    const state = stateWith([])
    const actions = stubActions()
    expect(replayOps([{ id: 't1', type: OP_SET_TASK_DONE, done: true, ts: NOW }], actions, () => state)).toBe(0)
  })

  it('loses to a newer in-app edit', () => {
    const state = stateWith([task({ updatedAt: NOW + 5000 })])
    const actions = stubActions()
    expect(replayOps([{ id: 't1', type: OP_SET_TASK_DONE, done: true, ts: NOW }], actions, () => state)).toBe(0)
  })

  it('wins over an older in-app edit', () => {
    const state = stateWith([task({ updatedAt: NOW - 5000 })])
    const actions = stubActions()
    expect(replayOps([{ id: 't1', type: OP_SET_TASK_DONE, done: true, ts: NOW }], actions, () => state)).toBe(1)
  })
})

describe('replayOps moveCard', () => {
  const kanbanTask = over => task({ views: { kanban: true }, kanban: { columnId: 'col_todo' }, ...over })

  it('moves a card to an existing column', () => {
    const state = stateWith([kanbanTask()])
    const actions = stubActions()
    const applied = replayOps([{ id: 't1', type: OP_MOVE_CARD, columnId: 'col_done', ts: NOW }], actions, () => state)
    expect(applied).toBe(1)
    expect(actions.moveKanbanCard).toHaveBeenCalledWith('sem1', 't1', 'col_done')
  })

  it('drops a move to a column deleted since it was queued', () => {
    const state = stateWith([kanbanTask()])
    const actions = stubActions()
    expect(replayOps([{ id: 't1', type: OP_MOVE_CARD, columnId: 'col_gone', ts: NOW }], actions, () => state)).toBe(0)
  })

  it('drops a move for a task no longer on the board', () => {
    const state = stateWith([kanbanTask({ views: { kanban: false } })])
    const actions = stubActions()
    expect(replayOps([{ id: 't1', type: OP_MOVE_CARD, columnId: 'col_done', ts: NOW }], actions, () => state)).toBe(0)
  })

  it('is a no-op when the card is already in the target column', () => {
    const state = stateWith([kanbanTask()])
    const actions = stubActions()
    expect(replayOps([{ id: 't1', type: OP_MOVE_CARD, columnId: 'col_todo', ts: NOW }], actions, () => state)).toBe(0)
  })
})

describe('replayOps setGoalCheckIn', () => {
  it('checks in a goal queued from the widget', () => {
    const state = { goals: [goal()] }
    const actions = stubActions()
    const applied = replayOps(
      [{ id: 'g1', type: OP_SET_GOAL_CHECKIN, done: true, ts: NOW }],
      actions, () => state,
    )
    expect(applied).toBe(1)
    expect(actions.checkInGoal).toHaveBeenCalledWith('g1', currentPeriodKey(state.goals[0], new Date(NOW)))
  })

  it('undoes a check in', () => {
    const key = currentPeriodKey(goal(), new Date(NOW))
    const state = { goals: [goal({ checkIns: { [key]: { at: NOW, note: '' } } })] }
    const actions = stubActions()
    replayOps([{ id: 'g1', type: OP_SET_GOAL_CHECKIN, done: false, ts: NOW }], actions, () => state)
    expect(actions.undoGoalCheckIn).toHaveBeenCalledWith('g1', key)
  })

  it('ignores an op that matches the current state', () => {
    const key = currentPeriodKey(goal(), new Date(NOW))
    const state = { goals: [goal({ checkIns: { [key]: { at: NOW, note: '' } } })] }
    const actions = stubActions()
    const applied = replayOps(
      [{ id: 'g1', type: OP_SET_GOAL_CHECKIN, done: true, ts: NOW }],
      actions, () => state,
    )
    expect(applied).toBe(0)
    expect(actions.checkInGoal).not.toHaveBeenCalled()
  })

  it('ignores an op for a missing goal', () => {
    const actions = stubActions()
    const applied = replayOps(
      [{ id: 'nope', type: OP_SET_GOAL_CHECKIN, done: true, ts: NOW }],
      actions, () => ({ goals: [] }),
    )
    expect(applied).toBe(0)
  })

  it('ignores a check in on a rest day', () => {
    const restDay = goal({ cadenceDays: 'custom', weekdays: [] })
    const actions = stubActions()
    const applied = replayOps(
      [{ id: 'g1', type: OP_SET_GOAL_CHECKIN, done: true, ts: NOW }],
      actions, () => ({ goals: [restDay] }),
    )
    expect(applied).toBe(0)
    expect(actions.checkInGoal).not.toHaveBeenCalled()
  })

  it('rejects a goal op without a boolean', () => {
    expect(isValidOp({ id: 'g1', type: OP_SET_GOAL_CHECKIN, done: 'yes', ts: NOW })).toBe(false)
  })
})

describe('replayOps setFocusRunning', () => {
  it('starts a paused timer', () => {
    const state = { focusSync: { status: 'paused', startedAt: null, updatedAt: 0 } }
    const actions = stubActions()
    const applied = replayOps(
      [{ id: 'focus', type: OP_SET_FOCUS_RUNNING, running: true, ts: NOW }],
      actions, () => state,
    )
    expect(applied).toBe(1)
    expect(actions.setFocusSync).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'started', startedAt: Math.floor(NOW / 1000) }),
    )
  })

  it('pauses a running timer and banks elapsed time', () => {
    const startedAt = Math.floor(NOW / 1000) - 60
    const state = {
      focusSync: {
        status: 'started', startedAt, updatedAt: 0,
        cycleElapsedBase: 10, totalElapsedBase: 100,
      },
    }
    const actions = stubActions()
    replayOps([{ id: 'focus', type: OP_SET_FOCUS_RUNNING, running: false, ts: NOW }], actions, () => state)
    expect(actions.setFocusSync).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'paused', cycleElapsedBase: 70, totalElapsedBase: 160 }),
    )
  })

  it('ignores an op that matches the current state', () => {
    const state = { focusSync: { status: 'started', startedAt: 1, updatedAt: 0 } }
    const actions = stubActions()
    const applied = replayOps(
      [{ id: 'focus', type: OP_SET_FOCUS_RUNNING, running: true, ts: NOW }],
      actions, () => state,
    )
    expect(applied).toBe(0)
    expect(actions.setFocusSync).not.toHaveBeenCalled()
  })

  it('ignores a stale op', () => {
    const state = { focusSync: { status: 'paused', startedAt: null, updatedAt: NOW + 5000 } }
    const actions = stubActions()
    const applied = replayOps(
      [{ id: 'focus', type: OP_SET_FOCUS_RUNNING, running: true, ts: NOW }],
      actions, () => state,
    )
    expect(applied).toBe(0)
  })

  it('rejects a focus op without a boolean', () => {
    expect(isValidOp({ id: 'focus', type: OP_SET_FOCUS_RUNNING, running: 'yes', ts: NOW })).toBe(false)
  })
})

describe('replayOps ordering', () => {
  it('applies ops oldest first regardless of queue order', () => {
    const seen = []
    const state = stateWith([task(), task({ id: 't2' })])
    const actions = { setTaskDone: id => seen.push(id), moveKanbanCard: vi.fn() }
    replayOps([
      { id: 't2', type: OP_SET_TASK_DONE, done: true, ts: NOW + 100 },
      { id: 't1', type: OP_SET_TASK_DONE, done: true, ts: NOW },
    ], actions, () => state)
    expect(seen).toEqual(['t1', 't2'])
  })

  it('skips malformed ops without aborting the batch', () => {
    const state = stateWith([task()])
    const actions = stubActions()
    const applied = replayOps([
      { garbage: true },
      { id: 't1', type: OP_SET_TASK_DONE, done: true, ts: NOW },
    ], actions, () => state)
    expect(applied).toBe(1)
  })
})
