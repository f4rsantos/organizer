import { describe, it, expect } from 'vitest'
import { migrateState, normalizeState, CURRENT_VERSION } from '../../src/store/migrations'

function baseRawState(overrides = {}) {
  return {
    version: 7,
    theme: 'system',
    lang: 'en',
    onboardingDone: true,
    activeSemesterId: null,
    semesters: [],
    classes: [],
    tasks: [],
    events: [],
    notes: [],
    noteFolders: [],
    habits: [],
    kanban: {},
    grades: {},
    ...overrides,
  }
}

describe('migrateV8UnifyNotifications', () => {
  it('bumps CURRENT_VERSION to 8', () => {
    expect(CURRENT_VERSION).toBe(8)
  })

  it('converts focusAlertMode=both into vibrate+sound+browserPush enabled', () => {
    const raw = baseRawState({ settings: { focusAlertMode: 'both' } })
    const { state, status } = migrateState(raw)
    expect(status).toBe('migrated')
    expect(state.settings.notifications).toMatchObject({ vibrate: true, sound: true, browserPush: true, enabled: true })
    expect(state.settings.focusAlertMode).toBeUndefined()
  })

  it('converts focusAlertMode=vibration into vibrate only', () => {
    const raw = baseRawState({ settings: { focusAlertMode: 'vibration' } })
    const { state } = migrateState(raw)
    expect(state.settings.notifications.vibrate).toBe(true)
    expect(state.settings.notifications.sound).toBe(false)
    expect(state.settings.notifications.browserPush).toBe(false)
  })

  it('converts legacy vibrateOnPageFocus when focusAlertMode is absent', () => {
    const raw = baseRawState({ settings: { vibrateOnPageFocus: true } })
    const { state } = migrateState(raw)
    expect(state.settings.notifications.vibrate).toBe(true)
    expect(state.settings.vibrateOnPageFocus).toBeUndefined()
  })

  it('converts taskAlertMode=notification into sound+browserPush and marks taskAlertsEnabled', () => {
    const raw = baseRawState({ settings: { taskAlertMode: 'notification' } })
    const { state } = migrateState(raw)
    expect(state.settings.notifications.sound).toBe(true)
    expect(state.settings.notifications.browserPush).toBe(true)
    expect(state.settings.taskAlertsEnabled).toBe(true)
    expect(state.settings.taskAlertMode).toBeUndefined()
  })

  it('converts taskAlertMode=in-app into taskAlertsEnabled+taskAlertsInApp without sound', () => {
    const raw = baseRawState({ settings: { taskAlertMode: 'in-app' } })
    const { state } = migrateState(raw)
    expect(state.settings.taskAlertsEnabled).toBe(true)
    expect(state.settings.taskAlertsInApp).toBe(true)
    expect(state.settings.notifications.sound).toBe(false)
  })

  it('disables everything when both legacy modes are none', () => {
    const raw = baseRawState({ settings: { focusAlertMode: 'none', taskAlertMode: 'none' } })
    const { state } = migrateState(raw)
    expect(state.settings.notifications.enabled).toBe(false)
    expect(state.settings.taskAlertsEnabled).toBe(false)
  })

  it('does not overwrite an already-migrated notifications object', () => {
    const raw = baseRawState({
      version: 8,
      settings: { notifications: { enabled: false, intrusiveness: 'alert', vibrate: true, sound: true, browserPush: true, bellVisibility: 'always' } },
    })
    const { state, status } = migrateState(raw)
    expect(status).toBe('ok')
    expect(state.settings.notifications.intrusiveness).toBe('alert')
    expect(state.settings.notifications.bellVisibility).toBe('always')
  })

  it('normalizeState fills in defaults for a state with no settings at all', () => {
    const state = normalizeState(baseRawState({ version: 8 }))
    expect(state.settings.notifications).toEqual({
      enabled: true, intrusiveness: 'toast', vibrate: false, sound: false, browserPush: false, bellVisibility: 'hideEmpty',
    })
    expect(state.settings.focus.alertsEnabled).toBe(true)
    expect(state.settings.taskAlertsEnabled).toBe(false)
  })

  it('strips stray legacy keys during normalizeState even if migration was skipped', () => {
    const state = normalizeState(baseRawState({
      version: 8,
      settings: { focusAlertMode: 'both', taskAlertMode: 'both', vibrateOnPageFocus: true },
    }))
    expect(state.settings.focusAlertMode).toBeUndefined()
    expect(state.settings.taskAlertMode).toBeUndefined()
    expect(state.settings.vibrateOnPageFocus).toBeUndefined()
  })
})
