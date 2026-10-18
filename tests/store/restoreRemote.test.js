import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resetStateDb, createLocalStorage } from '../helpers/testStorage.js'

const CONFIG = { projectId: 'my-project' }

beforeEach(async () => {
  vi.stubGlobal('localStorage', createLocalStorage())
  vi.resetModules()
  await resetStateDb()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function load() {
  const { useStore } = await import('../../src/store/useStore.js')
  const { CURRENT_VERSION } = await import('../../src/store/migrations.js')
  const { restoreFromRemote } = await import('../../src/lib/sync/restoreRemote.js')
  useStore.setState({ hydrated: true, onboardingDone: false, lang: 'en', settings: { ...useStore.getState().settings, workMode: false } })
  return { useStore, CURRENT_VERSION, restoreFromRemote }
}

describe('restoring a synced account during onboarding', () => {
  it('brings in the remote data and the remote settings over fresh-device defaults', async () => {
    const { useStore, CURRENT_VERSION, restoreFromRemote } = await load()
    const remote = {
      version: CURRENT_VERSION,
      onboardingDone: true,
      tasks: [{ id: 't1', title: 'Essay' }],
      settings: { workMode: true },
    }

    const outcome = await restoreFromRemote({
      config: CONFIG,
      pull: async () => ({ state: remote, rev: 7 }),
      importData: useStore.getState().importData,
    })

    const state = useStore.getState()
    expect(outcome).toEqual({ status: 'restored', rev: 7 })
    expect(state.tasks.map(t => t.title)).toEqual(['Essay'])
    expect(state.settings.workMode).toBe(true)
    expect(state.syncBase?.scope).toBe('my-project')
  })

  it('reports an empty project and leaves local state alone', async () => {
    const { useStore, restoreFromRemote } = await load()
    useStore.setState({ tasks: [{ id: 'local', title: 'Mine' }] })

    const outcome = await restoreFromRemote({
      config: CONFIG,
      pull: async () => null,
      importData: useStore.getState().importData,
    })

    expect(outcome.status).toBe('empty')
    expect(useStore.getState().tasks.map(t => t.title)).toEqual(['Mine'])
  })

  it('refuses data written by a newer app version', async () => {
    const { useStore, CURRENT_VERSION, restoreFromRemote } = await load()

    const outcome = await restoreFromRemote({
      config: CONFIG,
      pull: async () => ({ state: { version: CURRENT_VERSION + 1, tasks: [{ id: 'x', title: 'Future' }] }, rev: 1 }),
      importData: useStore.getState().importData,
    })

    expect(outcome.status).toBe('newer')
    expect(useStore.getState().tasks).toEqual([])
  })

  it('gives up on a pull that never answers instead of hanging the screen', async () => {
    const { useStore, restoreFromRemote } = await load()
    vi.useFakeTimers()
    try {
      const pending = restoreFromRemote({
        config: CONFIG,
        pull: () => new Promise(() => {}),
        importData: useStore.getState().importData,
        timeoutMs: 5000,
      })
      const settled = expect(pending).rejects.toThrow('restore-timeout')
      await vi.advanceTimersByTimeAsync(5000)
      await settled
    } finally {
      vi.useRealTimers()
    }
  })
})
