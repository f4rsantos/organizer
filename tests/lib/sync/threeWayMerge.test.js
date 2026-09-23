import { describe, it, expect } from 'vitest'
import { fingerprintState } from '../../../src/lib/sync/fingerprint.js'
import { mergeSyncedState } from '../../../src/lib/sync/threeWayMerge.js'

const task = (id, fields = {}) => ({ id, title: id, done: false, ...fields })

function merge(baseState, local, remote) {
  return mergeSyncedState(fingerprintState(baseState), local, remote)
}

describe('mergeSyncedState lists', () => {
  const base = { tasks: [task('a'), task('b')] }

  it('keeps items added locally while the remote copy stayed the same', () => {
    const merged = merge(base, { tasks: [task('a'), task('b'), task('c')] }, base)
    expect(merged.tasks.map(t => t.id)).toEqual(['a', 'b', 'c'])
  })

  it('keeps items added on both sides', () => {
    const merged = merge(base, { tasks: [...base.tasks, task('local')] }, { tasks: [...base.tasks, task('remote')] })
    expect(merged.tasks.map(t => t.id)).toEqual(['a', 'b', 'remote', 'local'])
  })

  it('takes a remote edit when the local copy is unchanged', () => {
    const merged = merge(base, base, { tasks: [task('a', { done: true }), task('b')] })
    expect(merged.tasks[0].done).toBe(true)
  })

  it('keeps a local edit when the remote copy is unchanged', () => {
    const merged = merge(base, { tasks: [task('a', { done: true }), task('b')] }, base)
    expect(merged.tasks[0].done).toBe(true)
  })

  it('keeps edits to different items from both sides', () => {
    const merged = merge(
      base,
      { tasks: [task('a', { done: true }), task('b')] },
      { tasks: [task('a'), task('b', { title: 'renamed' })] },
    )
    expect(merged.tasks).toEqual([task('a', { done: true }), task('b', { title: 'renamed' })])
  })

  it('applies a remote delete when the local copy is unchanged', () => {
    const merged = merge(base, base, { tasks: [task('a')] })
    expect(merged.tasks.map(t => t.id)).toEqual(['a'])
  })

  it('applies a local delete when the remote copy is unchanged', () => {
    const merged = merge(base, { tasks: [task('b')] }, base)
    expect(merged.tasks.map(t => t.id)).toEqual(['b'])
  })

  it('keeps a local edit over a remote delete', () => {
    const merged = merge(base, { tasks: [task('a', { done: true }), task('b')] }, { tasks: [task('b')] })
    expect(merged.tasks.map(t => t.id).sort()).toEqual(['a', 'b'])
  })

  it('keeps a remote edit over a local delete', () => {
    const merged = merge(base, { tasks: [task('b')] }, { tasks: [task('a', { done: true }), task('b')] })
    expect(merged.tasks.find(t => t.id === 'a').done).toBe(true)
  })

  it('picks the newer copy when both sides edited the same item', () => {
    const noteBase = { notes: [{ id: 'n', body: 'x', updatedAt: 1 }] }
    const local = { notes: [{ id: 'n', body: 'local', updatedAt: 3 }] }
    const remote = { notes: [{ id: 'n', body: 'remote', updatedAt: 2 }] }
    expect(merge(noteBase, local, remote).notes[0].body).toBe('local')
    expect(merge(noteBase, remote, local).notes[0].body).toBe('local')
  })

  it('falls back to the remote copy when both edited an item without timestamps', () => {
    const merged = merge(
      base,
      { tasks: [task('a', { title: 'L' }), task('b')] },
      { tasks: [task('a', { title: 'R' }), task('b')] },
    )
    expect(merged.tasks[0].title).toBe('R')
  })
})

describe('mergeSyncedState nested maps', () => {
  const base = { grades: { sem: { c1: { components: [] }, c2: { components: [] } } } }

  it('merges grade edits to different classes of one semester', () => {
    const merged = merge(
      base,
      { grades: { sem: { c1: { components: [{ id: 'x' }] }, c2: { components: [] } } } },
      { grades: { sem: { c1: { components: [] }, c2: { components: [{ id: 'y' }] } } } },
    )
    expect(merged.grades.sem.c1.components).toEqual([{ id: 'x' }])
    expect(merged.grades.sem.c2.components).toEqual([{ id: 'y' }])
  })

  it('drops a semester deleted remotely when nothing local changed in it', () => {
    expect(merge(base, base, { grades: {} }).grades).toEqual({})
  })

  it('keeps map keys added locally', () => {
    const merged = merge({ dismissedNextSemester: {} }, { dismissedNextSemester: { sem: true } }, { dismissedNextSemester: {} })
    expect(merged.dismissedNextSemester).toEqual({ sem: true })
  })
})

describe('mergeSyncedState habits', () => {
  const habit = checkIns => ({ id: 'h', title: 'Run', checkIns })
  const base = { habits: [habit({ '2026-09-20': { at: 1, note: '' } })] }

  it('keeps check-ins made on different devices for the same habit', () => {
    const merged = merge(
      base,
      { habits: [habit({ '2026-09-20': { at: 1, note: '' }, '2026-09-21': { at: 2, note: '' } })] },
      { habits: [habit({ '2026-09-20': { at: 1, note: '' }, '2026-09-22': { at: 3, note: '' } })] },
    )
    expect(Object.keys(merged.habits[0].checkIns).sort()).toEqual(['2026-09-20', '2026-09-21', '2026-09-22'])
  })

  it('applies an undone check-in from one device alongside a rename on the other', () => {
    const merged = merge(
      base,
      { habits: [habit({})] },
      { habits: [{ ...habit({ '2026-09-20': { at: 1, note: '' } }), title: 'Run 5k' }] },
    )
    expect(merged.habits[0]).toEqual({ id: 'h', title: 'Run 5k', checkIns: {} })
  })

  it('deletes a habit removed on one device when the other did not touch it', () => {
    expect(merge(base, base, { habits: [] }).habits).toEqual([])
  })

  it('keeps a habit checked in on one device and deleted on the other', () => {
    const checkedIn = { habits: [habit({ '2026-09-20': { at: 1, note: '' }, '2026-09-21': { at: 2, note: '' } })] }
    expect(merge(base, checkedIn, { habits: [] }).habits).toHaveLength(1)
  })
})

describe('mergeSyncedState pomodoros', () => {
  const aggregate = (completedCount, focusSecs) => ({ id: 'pomodoro-aggregate', kind: 'aggregate', completedCount, abandonedCount: 0, focusSecs })
  const tomato = id => ({ id, abandoned: false, pct: 2.5, createdAt: 1 })

  it('keeps tomatoes completed on both devices', () => {
    const merged = merge({ pomodoros: [] }, { pomodoros: [tomato('a')] }, { pomodoros: [tomato('b')] })
    expect(merged.pomodoros.map(p => p.id).sort()).toEqual(['a', 'b'])
  })

  it('keeps a week rollover compaction instead of losing the folded tomatoes', () => {
    const base = { pomodoros: [aggregate(5, 100), tomato('a'), tomato('b')] }
    const merged = merge(base, { pomodoros: [aggregate(7, 140)] }, base)
    expect(merged.pomodoros).toEqual([aggregate(7, 140)])
  })

  it('prefers the fuller aggregate when both devices compacted differently', () => {
    const base = { pomodoros: [aggregate(5, 100)] }
    const merged = merge(base, { pomodoros: [aggregate(8, 160)] }, { pomodoros: [aggregate(7, 140)] })
    expect(merged.pomodoros).toEqual([aggregate(8, 160)])
  })
})

describe('mergeSyncedState notifications and focus', () => {
  it('keeps alert dismissals made on both devices', () => {
    const merged = merge(
      { taskAlertStates: {} },
      { taskAlertStates: { 't1:2026-09-22': { hidden: true, remindAt: null } } },
      { taskAlertStates: { 't2:2026-09-22': { hidden: true, remindAt: null } } },
    )
    expect(Object.keys(merged.taskAlertStates).sort()).toEqual(['t1:2026-09-22', 't2:2026-09-22'])
  })

  it('takes the most recent focus timer state', () => {
    const merged = merge(
      { focusSync: { status: 'paused', updatedAt: 1 } },
      { focusSync: { status: 'started', updatedAt: 5 } },
      { focusSync: { status: 'paused', updatedAt: 3 } },
    )
    expect(merged.focusSync.status).toBe('started')
  })
})

describe('mergeSyncedState values', () => {
  it('keeps a local change to a single value', () => {
    expect(merge({ activeSemesterId: 'a' }, { activeSemesterId: 'b' }, { activeSemesterId: 'a' }).activeSemesterId).toBe('b')
  })

  it('takes a remote change to a single value', () => {
    expect(merge({ activeSemesterId: 'a' }, { activeSemesterId: 'a' }, { activeSemesterId: 'c' }).activeSemesterId).toBe('c')
  })
})
