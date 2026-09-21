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

describe('importData with collab.aliasPromptedTeamIds', () => {
  it('keeps a locally dismissed team prompt when the remote copy has not caught up yet', async () => {
    const { useStore } = await import('../../src/store/useStore.js')
    const { CURRENT_VERSION } = await import('../../src/store/migrations.js')

    useStore.setState({
      hydrated: true,
      collab: { userId: 'me', memberships: [{ teamId: 'team1' }], aliasPromptedTeamIds: ['team1'] },
    })

    useStore.getState().importData({
      version: CURRENT_VERSION,
      collab: { userId: 'me', memberships: [{ teamId: 'team1' }], aliasPromptedTeamIds: [] },
    })

    expect(useStore.getState().collab.aliasPromptedTeamIds).toEqual(['team1'])
  })

  it('adopts a team dismissed on another device', async () => {
    const { useStore } = await import('../../src/store/useStore.js')
    const { CURRENT_VERSION } = await import('../../src/store/migrations.js')

    useStore.setState({
      hydrated: true,
      collab: { userId: 'me', memberships: [{ teamId: 'team1' }], aliasPromptedTeamIds: [] },
    })

    useStore.getState().importData({
      version: CURRENT_VERSION,
      collab: { userId: 'me', memberships: [{ teamId: 'team1' }], aliasPromptedTeamIds: ['team1'] },
    })

    expect(useStore.getState().collab.aliasPromptedTeamIds).toEqual(['team1'])
  })
})
