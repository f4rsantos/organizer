import { describe, it, expect } from 'vitest'
import { isTaskDone, splitCompletedTasks, groupTasksByClass } from './taskUtils.js'

function makeTask(overrides = {}) {
  return { id: 't1', semesterId: 's1', classId: null, done: false, ...overrides }
}

describe('isTaskDone', () => {
  it('reads the local done flag', () => {
    expect(isTaskDone(makeTask({ done: true }), 'u1')).toBe(true)
    expect(isTaskDone(makeTask({ done: false }), 'u1')).toBe(false)
  })

  it('ignores the local flag for remote shared tasks', () => {
    const task = makeTask({ done: true, sharedMeta: { remote: true }, doneBy: {} })
    expect(isTaskDone(task, 'u1')).toBe(false)
  })

  it('treats a remote shared task done for everyone as done', () => {
    const task = makeTask({ sharedMeta: { remote: true }, doneForAll: true })
    expect(isTaskDone(task, 'u1')).toBe(true)
  })

  it('treats a remote shared task done by this user as done', () => {
    const task = makeTask({ sharedMeta: { remote: true }, doneBy: { u1: true } })
    expect(isTaskDone(task, 'u1')).toBe(true)
    expect(isTaskDone(task, 'u2')).toBe(false)
  })

  it('handles missing tasks', () => {
    expect(isTaskDone(null, 'u1')).toBe(false)
    expect(isTaskDone(undefined, 'u1')).toBe(false)
  })
})

describe('isTaskDone with a per-team resolver', () => {
  const shared = (teamId, doneBy) => ({
    sharedMeta: { remote: true, teamId }, doneBy, doneForAll: false,
  })

  it('reads doneBy with the id for the task team', () => {
    // Each team keys doneBy by its own per-project auth UID, so one list can
    // need two different ids.
    const resolve = teamId => (teamId === 'tA' ? 'uid_a' : 'uid_b')
    expect(isTaskDone(shared('tA', { uid_a: true }), resolve)).toBe(true)
    expect(isTaskDone(shared('tB', { uid_a: true }), resolve)).toBe(false)
    expect(isTaskDone(shared('tB', { uid_b: true }), resolve)).toBe(true)
  })

  it('still accepts a plain id', () => {
    expect(isTaskDone(shared('tA', { uid_a: true }), 'uid_a')).toBe(true)
  })

  it('never calls the resolver for a local task', () => {
    let calls = 0
    const resolve = () => { calls += 1; return 'x' }
    expect(isTaskDone({ done: true }, resolve)).toBe(true)
    expect(calls).toBe(0)
  })
})

describe('splitCompletedTasks', () => {
  it('separates pending from completed while keeping order', () => {
    const tasks = [
      makeTask({ id: 'a', done: false }),
      makeTask({ id: 'b', done: true }),
      makeTask({ id: 'c', done: false }),
      makeTask({ id: 'd', done: true }),
    ]
    const { pending, completed } = splitCompletedTasks(tasks, 'u1')
    expect(pending.map(t => t.id)).toEqual(['a', 'c'])
    expect(completed.map(t => t.id)).toEqual(['b', 'd'])
  })

  it('returns empty lists for no tasks', () => {
    expect(splitCompletedTasks([], 'u1')).toEqual({ pending: [], completed: [] })
    expect(splitCompletedTasks(undefined, 'u1')).toEqual({ pending: [], completed: [] })
  })

  it('reports no completed tasks when nothing is done', () => {
    const { pending, completed } = splitCompletedTasks([makeTask({ id: 'a' })], 'u1')
    expect(pending).toHaveLength(1)
    expect(completed).toHaveLength(0)
  })

  it('uses shared completion for remote tasks', () => {
    const tasks = [
      makeTask({ id: 'a', done: true, sharedMeta: { remote: true }, doneBy: {} }),
      makeTask({ id: 'b', sharedMeta: { remote: true }, doneBy: { u1: true } }),
    ]
    const { pending, completed } = splitCompletedTasks(tasks, 'u1')
    expect(pending.map(t => t.id)).toEqual(['a'])
    expect(completed.map(t => t.id)).toEqual(['b'])
  })

  it('splits each class group independently', () => {
    const classes = [{ id: 'c1', name: 'One', color: '#111' }, { id: 'c2', name: 'Two', color: '#222' }]
    const tasks = [
      makeTask({ id: 'a', classId: 'c1', done: true }),
      makeTask({ id: 'b', classId: 'c1', done: false }),
      makeTask({ id: 'c', classId: 'c2', done: false }),
    ]
    const splits = groupTasksByClass(tasks, classes)
      .map(({ cls, tasks: groupTasks }) => [cls.id, splitCompletedTasks(groupTasks, 'u1')])
    const byId = Object.fromEntries(splits)
    expect(byId.c1.completed.map(t => t.id)).toEqual(['a'])
    expect(byId.c1.pending.map(t => t.id)).toEqual(['b'])
    expect(byId.c2.completed).toEqual([])
    expect(byId.other.completed).toEqual([])
  })
})
