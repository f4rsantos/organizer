import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resetStateDb } from '../helpers/testStorage.js'

const SCOPE = 'organizer-project'

function createStorage() {
  const map = new Map()
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    clear: () => map.clear(),
    key: i => [...map.keys()][i] ?? null,
    get length() { return map.size },
  }
}

beforeEach(async () => {
  vi.stubGlobal('localStorage', createStorage())
  vi.resetModules()
  await resetStateDb()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const semester = { id: 'sem', name: '3a1s', presetKey: '3a1s', startDate: '2026-09-14', endDate: '2027-02-10' }
const oldClass = { id: 'c-old', semesterId: 'sem', name: 'CD', ects: 6 }
const oldTask = { id: 't-old', semesterId: 'sem', title: 'Old', done: false }

async function loadSyncedStore() {
  const { useStore } = await import('../../src/store/useStore.js')
  const { CURRENT_VERSION } = await import('../../src/store/migrations.js')
  const synced = {
    version: CURRENT_VERSION,
    activeSemesterId: 'sem',
    semesters: [semester],
    classes: [oldClass],
    tasks: [oldTask],
    presetUpdatedAt: { '3a1s': 1789000000000 },
  }
  useStore.setState({ hydrated: true })
  useStore.getState().importData(synced, { syncScope: SCOPE })
  return { useStore, synced }
}

describe('sync pull merges instead of replacing local state', () => {
  it('keeps a preset update that has not been pushed yet', async () => {
    const { useStore, synced } = await loadSyncedStore()
    useStore.getState().addClass({ semesterId: 'sem', name: 'IA', ects: 6 })
    useStore.getState().setPresetUpdatedAt('3a1s', 1790071577600)

    useStore.getState().importData(synced, { syncScope: SCOPE })

    const state = useStore.getState()
    expect(state.classes.map(c => c.name)).toEqual(['CD', 'IA'])
    expect(state.presetUpdatedAt['3a1s']).toBe(1790071577600)
  })

  it('applies another device’s delete while keeping this device’s additions', async () => {
    const { useStore, synced } = await loadSyncedStore()
    useStore.getState().addClass({ semesterId: 'sem', name: 'IA', ects: 6 })

    useStore.getState().importData({ ...synced, tasks: [] }, { syncScope: SCOPE })

    const state = useStore.getState()
    expect(state.tasks).toEqual([])
    expect(state.classes.map(c => c.name)).toEqual(['CD', 'IA'])
  })

  it('replaces local state when the base belongs to another Firebase project', async () => {
    const { useStore, synced } = await loadSyncedStore()
    useStore.getState().addClass({ semesterId: 'sem', name: 'IA', ects: 6 })

    useStore.getState().importData(synced, { syncScope: 'another-project' })

    expect(useStore.getState().classes.map(c => c.name)).toEqual(['CD'])
    expect(useStore.getState().syncBase.scope).toBe('another-project')
  })

  it('leaves the sync base alone when restoring a backup file', async () => {
    const { useStore, synced } = await loadSyncedStore()
    const base = useStore.getState().syncBase

    useStore.getState().importData({ ...synced, tasks: [] }, { preferLocalSettings: false })

    expect(useStore.getState().syncBase).toBe(base)
    expect(useStore.getState().tasks).toEqual([])
  })
})

describe('sync pull settles after a push', () => {
  async function pushed(useStore) {
    const { stripLocalSlices, stripTransient } = await import('../../src/lib/crypto/sliceCodec.js')
    const { createSyncBase, toSyncedView } = await import('../../src/lib/sync/syncBase.js')
    const state = JSON.parse(JSON.stringify(toSyncedView(stripLocalSlices(stripTransient(useStore.getState())))))
    useStore.getState().setSyncBase(createSyncBase(SCOPE, state))
    return state
  }

  it('finds nothing left to push after pulling back what it just pushed', async () => {
    const { useStore } = await loadSyncedStore()
    const { hasUnsyncedChanges } = await import('../../src/lib/sync/syncBase.js')
    useStore.getState().addTask({ semesterId: 'sem', title: 'Fresh', weekStart: '2026-09-21' })
    useStore.getState().addHabit({ title: 'Read' })
    useStore.getState().addEvent({ title: 'Exam', date: '2026-10-01' })

    const remote = await pushed(useStore)
    useStore.getState().importData(remote, { syncScope: SCOPE })
    const once = useStore.getState()
    expect(hasUnsyncedChanges(once.syncBase, SCOPE, once)).toBe(false)

    const again = await pushed(useStore)
    useStore.getState().importData(again, { syncScope: SCOPE })
    const twice = useStore.getState()
    expect(hasUnsyncedChanges(twice.syncBase, SCOPE, twice)).toBe(false)
    expect(twice.tasks.map(t => t.title)).toEqual(['Old', 'Fresh'])
  })

  it('keeps the AI assistant runs and journal, which never sync', async () => {
    const { useStore, synced } = await loadSyncedStore()
    const agentJournal = { entries: [{ id: 'j1', text: 'remember this' }] }
    const agentRuntime = { runs: { r1: { id: 'r1', status: 'done', ops: [], inverse: [] } }, activeRunId: null }
    useStore.setState({ agentJournal, agentRuntime })

    useStore.getState().importData(synced, { syncScope: SCOPE })

    expect(useStore.getState().agentJournal).toBe(agentJournal)
    expect(useStore.getState().agentRuntime).toBe(agentRuntime)
  })
})

describe('sync pull with pomodoros and habits', () => {
  it('keeps tomato stats after this device folds last week into the aggregate', async () => {
    const { useStore, synced } = await loadSyncedStore()
    const lastWeek = [
      { id: 'p1', abandoned: false, pct: 2.5, createdAt: 1000 },
      { id: 'p2', abandoned: false, pct: 2.5, createdAt: 2000 },
    ]
    const withTomatoes = { ...synced, pomodoros: lastWeek }
    useStore.getState().importData(withTomatoes, { syncScope: SCOPE })
    useStore.setState({ pomodoros: [{ kind: 'aggregate', id: 'pomodoro-aggregate', completedCount: 2, abandonedCount: 0, focusSecs: 0 }] })

    useStore.getState().importData(withTomatoes, { syncScope: SCOPE })

    const pomodoros = useStore.getState().pomodoros
    expect(pomodoros).toHaveLength(1)
    expect(pomodoros[0].completedCount).toBe(2)
  })

  it('backfills the fixed id on aggregates stored before it existed', async () => {
    const { normalizeState } = await import('../../src/store/migrations.js')
    const state = normalizeState({ pomodoros: [{ kind: 'aggregate', completedCount: 3, abandonedCount: 0, focusSecs: 0 }] })
    expect(state.pomodoros[0].id).toBe('pomodoro-aggregate')
  })

  it('keeps a habit check-in made here while another device checked in a different day', async () => {
    const { useStore, synced } = await loadSyncedStore()
    const habit = { id: 'h1', title: 'Run', checkIns: { '2026-09-20': { at: 1, note: '' } } }
    useStore.getState().importData({ ...synced, habits: [habit] }, { syncScope: SCOPE })

    useStore.getState().checkInHabit('h1', '2026-09-21')
    const remoteHabit = { ...habit, checkIns: { ...habit.checkIns, '2026-09-22': { at: 3, note: '' } } }
    useStore.getState().importData({ ...synced, habits: [remoteHabit] }, { syncScope: SCOPE })

    const checkIns = useStore.getState().habits[0].checkIns
    expect(Object.keys(checkIns).sort()).toEqual(['2026-09-20', '2026-09-21', '2026-09-22'])
  })
})
