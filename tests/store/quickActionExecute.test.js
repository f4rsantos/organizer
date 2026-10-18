import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resetStateDb, createLocalStorage } from '../helpers/testStorage.js'

const NOW = new Date('2026-10-18T12:00:00')

beforeEach(async () => {
  vi.stubGlobal('localStorage', createLocalStorage())
  vi.resetModules()
  await resetStateDb()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function setup() {
  const { useStore } = await import('../../src/store/useStore.js')
  const { en } = await import('../../src/lib/strings/en.js')
  const { parseQuickAction } = await import('../../src/lib/parser/quickActionParse.js')
  const { executeQuickAction, undoQuickAction, storeQuickActionContext } = await import('../../src/lib/quickAction/execute.js')
  useStore.setState({ hydrated: true, settings: { ...useStore.getState().settings, semesterMode: 'none' } })
  let counter = 0
  const run = text => {
    const items = parseQuickAction(text, { t: en, now: NOW, lang: 'en' })
    const ctx = storeQuickActionContext(useStore, { t: en, now: NOW, newId: () => `id${++counter}` })
    return executeQuickAction(items, ctx)
  }
  const undo = result => undoQuickAction(result.effects, storeQuickActionContext(useStore, { t: en, now: NOW }))
  return { useStore, run, undo }
}

describe('running quick actions against the store', () => {
  it('creates a dated task from a sentence', async () => {
    const { useStore, run } = await setup()
    const result = run('add task essay tomorrow')
    const task = useStore.getState().tasks.find(t => t.title === 'essay')
    expect(task.dueDate).toBe('2026-10-19')
    expect(result.summary).toEqual({ created: 1, updated: 0, removed: 0 })
  })

  it('undo removes everything the action created', async () => {
    const { useStore, run, undo } = await setup()
    const result = run('add tasks read, write and edit')
    expect(useStore.getState().tasks).toHaveLength(3)
    undo(result)
    expect(useStore.getState().tasks).toEqual([])
  })

  it('undo reopens a task the action completed', async () => {
    const { useStore, run, undo } = await setup()
    run('add task lab report')
    const result = run('complete lab report')
    expect(useStore.getState().tasks[0].done).toBe(true)
    undo(result)
    expect(useStore.getState().tasks[0].done).toBe(false)
  })

  it('undo brings back a task the action deleted', async () => {
    const { useStore, run, undo } = await setup()
    run('add task call mum')
    const result = run('delete call mum')
    expect(useStore.getState().tasks.filter(t => t.views?.list)).toEqual([])
    undo(result)
    expect(useStore.getState().tasks.map(t => t.title)).toEqual(['call mum'])
  })

  it('creates a timed calendar event', async () => {
    const { useStore, run } = await setup()
    run('add event dentist friday at 3pm')
    const event = useStore.getState().events.find(e => e.title === 'dentist')
    expect(event.startTime).toBe('15:00')
    expect(event.date).toBe('2026-10-23')
  })
})
