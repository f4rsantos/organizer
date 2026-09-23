import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resetStateDb } from '../helpers/testStorage.js'

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

async function storeWithPomodoro(pomodoro) {
  const { useStore } = await import('../../src/store/useStore.js')
  const settings = useStore.getState().settings
  useStore.setState({ hydrated: true, settings: { ...settings, pomodoro: { ...settings.pomodoro, ...pomodoro } } })
  return useStore
}

describe('recordFocusTomato', () => {
  it('adds one tomato per focus cycle even when several clocks report it', async () => {
    const useStore = await storeWithPomodoro({ enabled: true })
    useStore.getState().recordFocusTomato({ id: 'focus-100', focusSecs: 1500 })
    useStore.getState().recordFocusTomato({ id: 'focus-100', focusSecs: 1500 })
    useStore.getState().recordFocusTomato({ id: 'focus-200', focusSecs: 1500 })
    expect(useStore.getState().pomodoros.map(p => p.id)).toEqual(['focus-100', 'focus-200'])
  })

  it('does nothing while pomodoro tracking is off', async () => {
    const useStore = await storeWithPomodoro({ enabled: false })
    useStore.getState().recordFocusTomato({ id: 'focus-100', focusSecs: 1500 })
    expect(useStore.getState().pomodoros).toEqual([])
  })

  it('stores focus seconds only when stats tracking is on', async () => {
    const useStore = await storeWithPomodoro({ enabled: true, trackStats: true })
    useStore.getState().recordFocusTomato({ id: 'focus-100', focusSecs: 1500 })
    expect(useStore.getState().pomodoros[0]).toMatchObject({ id: 'focus-100', abandoned: false, focusSecs: 1500 })
  })

  it('ignores a cycle without an id', async () => {
    const useStore = await storeWithPomodoro({ enabled: true })
    useStore.getState().recordFocusTomato({ id: null, focusSecs: 1500 })
    expect(useStore.getState().pomodoros).toEqual([])
  })
})
