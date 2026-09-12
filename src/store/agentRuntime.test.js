import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'

async function freshStore(overrides = {}) {
  const { useStore } = await import('./useStore.js')
  useStore.setState({
    tasks: [],
    events: [],
    notes: [],
    noteFolders: [],
    habits: [],
    classes: [],
    agentRuntime: { runs: {}, activeRunId: null },
    agentJournal: { entries: [] },
    ...overrides,
  })
  return useStore
}

describe('startAgentRun / appendAgentOps / setAgentRunStatus', () => {
  it('creates a run in planning status and makes it active', async () => {
    const store = await freshStore()
    const runId = store.getState().startAgentRun({ scope: { type: 'global' }, slot: 'a', model: 'sonnet' })
    const state = store.getState()
    expect(state.agentRuntime.activeRunId).toBe(runId)
    expect(state.agentRuntime.runs[runId].status).toBe('planning')
  })

  it('appends ops and their inverses to the run', async () => {
    const store = await freshStore()
    const runId = store.getState().startAgentRun({ scope: { type: 'global' }, slot: 'a', model: 'sonnet' })
    store.getState().appendAgentOps(runId, [
      { type: 'create', entityType: 'task', id: 'local_1', entity: { title: 'New task' } },
    ])
    const run = store.getState().agentRuntime.runs[runId]
    expect(run.ops).toHaveLength(1)
    expect(run.inverse).toEqual([{ type: 'delete', entityType: 'task', targetId: 'local_1', priorEntity: { title: 'New task' } }])
  })

  it('transitions run status', async () => {
    const store = await freshStore()
    const runId = store.getState().startAgentRun({ scope: { type: 'global' }, slot: 'a', model: 'sonnet' })
    store.getState().setAgentRunStatus(runId, 'awaitingConfirm')
    expect(store.getState().agentRuntime.runs[runId].status).toBe('awaitingConfirm')
  })
})

describe('commitAgentRun', () => {
  it('replays ops through the ordinary store actions and removes the overlay', async () => {
    const store = await freshStore()
    const runId = store.getState().startAgentRun({ scope: { type: 'global' }, slot: 'a', model: 'sonnet' })
    store.getState().appendAgentOps(runId, [
      { type: 'create', entityType: 'task', id: 'local_1', entity: { title: 'Buy milk' } },
    ])
    store.getState().commitAgentRun(runId)
    const state = store.getState()
    expect(state.tasks.some(t => t.id === 'local_1' && t.title === 'Buy milk')).toBe(true)
    expect(state.agentRuntime.runs[runId]).toBeUndefined()
    expect(state.agentJournal.entries[0].runId).toBe(runId)
  })

  it('replays an update op through updateTask', async () => {
    const store = await freshStore({ tasks: [{ id: 't1', title: 'Old', done: false }] })
    const runId = store.getState().startAgentRun({ scope: { type: 'global' } })
    store.getState().appendAgentOps(runId, [
      { type: 'update', entityType: 'task', targetId: 't1', patch: { title: 'New' }, priorPatch: { title: 'Old' } },
    ])
    store.getState().commitAgentRun(runId)
    expect(store.getState().tasks.find(t => t.id === 't1').title).toBe('New')
  })

  it('replays a delete op through deleteTask', async () => {
    const store = await freshStore({ tasks: [{ id: 't1', title: 'Old', done: false, views: { list: true, kanban: false } }] })
    const runId = store.getState().startAgentRun({ scope: { type: 'global' } })
    store.getState().appendAgentOps(runId, [
      { type: 'delete', entityType: 'task', targetId: 't1', priorEntity: { title: 'Old' } },
    ])
    store.getState().commitAgentRun(runId)
    expect(store.getState().tasks.find(t => t.id === 't1')).toBeUndefined()
  })
})

describe('discardAgentRun', () => {
  it('leaves the rest of the state byte-identical, only dropping the run', async () => {
    const store = await freshStore()
    const before = store.getState()
    const runId = before.startAgentRun({ scope: { type: 'global' }, slot: 'a', model: 'sonnet' })
    store.getState().appendAgentOps(runId, [
      { type: 'create', entityType: 'task', id: 'local_1', entity: { title: 'Buy milk' } },
    ])
    const beforeTasks = store.getState().tasks
    const beforeJournal = store.getState().agentJournal
    store.getState().discardAgentRun(runId)
    const after = store.getState()
    expect(after.agentRuntime.runs[runId]).toBeUndefined()
    expect(after.agentRuntime.activeRunId).toBeNull()
    expect(after.tasks).toBe(beforeTasks)
    expect(after.agentJournal).toBe(beforeJournal)
  })
})

describe('undoAgentRun', () => {
  it('applies inverse ops for the most recent committed run', async () => {
    const store = await freshStore()
    const runId = store.getState().startAgentRun({ scope: { type: 'global' } })
    store.getState().appendAgentOps(runId, [
      { type: 'create', entityType: 'task', id: 'local_1', entity: { title: 'Buy milk' } },
    ])
    store.getState().commitAgentRun(runId)
    expect(store.getState().tasks.some(t => t.id === 'local_1')).toBe(true)
    store.getState().undoAgentRun(runId)
    expect(store.getState().tasks.some(t => t.id === 'local_1')).toBe(false)
    expect(store.getState().agentJournal.entries).toHaveLength(0)
  })

  it('is LIFO only, refusing to undo an older run while a newer one is undoable', async () => {
    const store = await freshStore()
    const run1 = store.getState().startAgentRun({ scope: { type: 'global' } })
    store.getState().appendAgentOps(run1, [{ type: 'create', entityType: 'task', id: 'first', entity: { title: 'First' } }])
    store.getState().commitAgentRun(run1)

    const run2 = store.getState().startAgentRun({ scope: { type: 'global' } })
    store.getState().appendAgentOps(run2, [{ type: 'create', entityType: 'task', id: 'second', entity: { title: 'Second' } }])
    store.getState().commitAgentRun(run2)

    store.getState().undoAgentRun(run1)
    expect(store.getState().tasks.some(t => t.id === 'first')).toBe(true)
    expect(store.getState().tasks.some(t => t.id === 'second')).toBe(true)
    expect(store.getState().agentJournal.entries).toHaveLength(2)
  })
})

describe('clearAgentJournal', () => {
  it('empties the journal', async () => {
    const store = await freshStore()
    const runId = store.getState().startAgentRun({ scope: { type: 'global' } })
    store.getState().appendAgentOps(runId, [{ type: 'create', entityType: 'task', id: 'local_1', entity: { title: 'x' } }])
    store.getState().commitAgentRun(runId)
    store.getState().clearAgentJournal()
    expect(store.getState().agentJournal.entries).toHaveLength(0)
  })
})
