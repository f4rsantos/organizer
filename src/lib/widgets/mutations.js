import { FREE_BOARD_ID } from '@/lib/taskUtils'
import { currentPeriodKey, isCheckedIn } from '@/lib/goals'

export const OP_SET_TASK_DONE = 'setTaskDone'
export const OP_MOVE_CARD = 'moveCard'
export const OP_SET_GOAL_CHECKIN = 'setGoalCheckIn'
export const OP_SET_FOCUS_RUNNING = 'setFocusRunning'

const HANDLERS = {
  [OP_SET_TASK_DONE]: applySetTaskDone,
  [OP_MOVE_CARD]: applyMoveCard,
  [OP_SET_GOAL_CHECKIN]: applySetGoalCheckIn,
  [OP_SET_FOCUS_RUNNING]: applySetFocusRunning,
}

function isFreshOp(op) {
  return Number.isFinite(op?.ts) && op.ts > 0
}

export function isValidOp(op) {
  if (!op || typeof op.id !== 'string' || !op.id) return false
  if (!isFreshOp(op)) return false
  if (op.type === OP_SET_TASK_DONE) return typeof op.done === 'boolean'
  if (op.type === OP_MOVE_CARD) return typeof op.columnId === 'string' && !!op.columnId
  if (op.type === OP_SET_GOAL_CHECKIN) return typeof op.done === 'boolean'
  if (op.type === OP_SET_FOCUS_RUNNING) return typeof op.running === 'boolean'
  return false
}

function findTask(state, id) {
  return (state.tasks ?? []).find(t => t.id === id) ?? null
}

function boardIdOf(task) {
  return task.semesterId ?? FREE_BOARD_ID
}

function columnExists(state, boardId, columnId) {
  const columns = state.kanban?.[boardId]?.columns ?? []
  return columns.some(c => c.id === columnId)
}

function applySetTaskDone(op, actions, state) {
  const task = findTask(state, op.id)
  if (!task) return false
  if (task.done === op.done) return false
  if (Number.isFinite(task.updatedAt) && task.updatedAt > op.ts) return false
  actions.setTaskDone(op.id, op.done)
  return true
}

function applyMoveCard(op, actions, state) {
  const task = findTask(state, op.id)
  if (!task) return false
  if (!task.views?.kanban) return false
  const boardId = boardIdOf(task)
  if (!columnExists(state, boardId, op.columnId)) return false
  if (task.kanban?.columnId === op.columnId) return false
  if (Number.isFinite(task.updatedAt) && task.updatedAt > op.ts) return false
  actions.moveKanbanCard(boardId, op.id, op.columnId)
  return true
}

function applySetGoalCheckIn(op, actions, state) {
  const goal = (state.goals ?? []).find(g => g.id === op.id)
  if (!goal) return false

  const periodKey = currentPeriodKey(goal, new Date(op.ts))
  if (!periodKey) return false
  if (isCheckedIn(goal, periodKey) === op.done) return false

  if (op.done) actions.checkInGoal(op.id, periodKey)
  else actions.undoGoalCheckIn(op.id, periodKey)
  return true
}

function applySetFocusRunning(op, actions, state) {
  const sync = state.focusSync ?? {}
  const running = sync.status === 'started'
  if (running === op.running) return false
  if (Number.isFinite(sync.updatedAt) && sync.updatedAt > op.ts) return false

  const nowSecs = Math.floor(op.ts / 1000)
  if (op.running) {
    actions.setFocusSync({ status: 'started', startedAt: nowSecs, updatedAt: op.ts })
    return true
  }

  const startedAt = Number.isFinite(sync.startedAt) ? sync.startedAt : null
  const gap = startedAt === null ? 0 : Math.max(0, nowSecs - startedAt)
  actions.setFocusSync({
    status: 'paused',
    startedAt: null,
    cycleElapsedBase: (Number.isFinite(sync.cycleElapsedBase) ? sync.cycleElapsedBase : 0) + gap,
    totalElapsedBase: (Number.isFinite(sync.totalElapsedBase) ? sync.totalElapsedBase : 0) + gap,
    updatedAt: op.ts,
  })
  return true
}

export function replayOps(ops, actions, getState) {
  const ordered = [...(ops ?? [])]
    .filter(isValidOp)
    .sort((a, b) => a.ts - b.ts)

  let applied = 0
  for (const op of ordered) {
    const handler = HANDLERS[op.type]
    if (!handler) continue
    if (handler(op, actions, getState())) applied += 1
  }
  return applied
}
