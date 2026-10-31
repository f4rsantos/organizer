import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createLocalStorage } from '../helpers/testStorage.js'

let registry

beforeEach(async () => {
  vi.stubGlobal('localStorage', createLocalStorage())
  vi.resetModules()
  registry = await import('../../src/apps/registry.js')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('app registry contract', () => {
  it('onboarding offers only the apps the maintainers chose, whatever a descriptor declares', () => {
    const selfPromoting = { id: 'community', descKey: 'x', setEnabled: () => {}, isEnabled: () => false, wipe: s => s }
    const offered = registry.onboardingApps({ semesters: [], activeSemesterId: null }, [...registry.APP_PLUGINS, selfPromoting]).map(app => app.id)
    expect(offered).not.toContain('community')
    expect(offered.length).toBeGreaterThan(0)
  })
})
