import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createLocalStorage, readStoredContainer, resetStateDb, flushPersist } from '../helpers/testStorage.js'
import { DATA_SLICES, LOCAL_SLICES } from '../../src/lib/crypto/sliceCodec.js'
import { CORE_OWNER, SETTINGS_OWNERS, SLICE_OWNERS } from '../../src/lib/appOwnership.js'

let useStore
let registry

const FILLED = { marker: 'left-behind' }

beforeEach(async () => {
  vi.stubGlobal('localStorage', createLocalStorage())
  vi.resetModules()
  await resetStateDb()
  ;({ useStore } = await import('../../src/store/useStore.js'))
  registry = await import('../../src/apps/registry.js')
  useStore.setState({ hydrated: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function appIds() {
  return new Set(registry.APP_PLUGINS.map(app => app.id))
}

function ownedBy(map, appId) {
  return Object.entries(map).filter(([, owner]) => owner === appId).map(([key]) => key)
}

function setPath(target, path, value) {
  const [head, tail] = path.split('.')
  if (!tail) return { ...target, [head]: value }
  return { ...target, [head]: { ...(target[head] ?? {}), [tail]: value } }
}

function readPath(target, path) {
  return path.split('.').reduce((node, key) => node?.[key], target)
}

describe('app data ownership', () => {
  it('every persisted slice has an owner, so no app can store data the core does not know how to erase', () => {
    const unowned = [...DATA_SLICES, ...LOCAL_SLICES].filter(slice => !SLICE_OWNERS[slice])
    expect(unowned).toEqual([])
  })

  it('every owner is the core or a registered app', () => {
    const owners = new Set([...Object.values(SLICE_OWNERS), ...Object.values(SETTINGS_OWNERS)])
    const unknown = [...owners].filter(owner => owner !== CORE_OWNER && !appIds().has(owner))
    expect(unknown).toEqual([])
  })

  it('disabling any app leaves none of its slices or settings behind', async () => {
    const owners = [...new Set([...Object.values(SLICE_OWNERS), ...Object.values(SETTINGS_OWNERS)])]
      .filter(owner => owner !== CORE_OWNER)

    for (const appId of owners) {
      const slices = ownedBy(SLICE_OWNERS, appId)
      const settingsKeys = ownedBy(SETTINGS_OWNERS, appId)
      const seeded = useStore.getState()
      const settings = settingsKeys.reduce((acc, key) => setPath(acc, key, FILLED), seeded.settings)
      useStore.setState({ ...Object.fromEntries(slices.map(slice => [slice, FILLED])), settings })

      useStore.getState().disableApp(appId)
      await flushPersist()

      const state = useStore.getState()
      const stored = (await readStoredContainer()).slices
      for (const slice of slices) {
        expect(state[slice], `${appId} left ${slice} in memory`).not.toEqual(FILLED)
        expect(stored?.[slice] ?? null, `${appId} left ${slice} on disk`).not.toEqual(FILLED)
      }
      for (const key of settingsKeys) {
        expect(readPath(state.settings, key), `${appId} left settings.${key}`).not.toEqual(FILLED)
      }
    }
  })
})
