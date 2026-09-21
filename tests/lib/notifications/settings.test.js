import { describe, it, expect } from 'vitest'
import {
  defaultNotificationSettings,
  getNotificationSettings,
  normalizeNotificationSettings,
} from '@/lib/notifications/settings'

describe('defaultNotificationSettings', () => {
  it('defaults to non-intrusive toasts with push/vibrate/sound off', () => {
    expect(defaultNotificationSettings()).toEqual({
      enabled: true,
      intrusiveness: 'toast',
      vibrate: false,
      sound: false,
      browserPush: false,
      bellVisibility: 'hideEmpty',
    })
  })
})

describe('getNotificationSettings', () => {
  it('falls back to defaults when settings.notifications is absent', () => {
    expect(getNotificationSettings({})).toEqual(defaultNotificationSettings())
  })

  it('merges partial overrides over the defaults', () => {
    const result = getNotificationSettings({ notifications: { intrusiveness: 'alert', sound: true } })
    expect(result.intrusiveness).toBe('alert')
    expect(result.sound).toBe(true)
    expect(result.vibrate).toBe(false)
  })
})

describe('normalizeNotificationSettings', () => {
  it('rejects an invalid intrusiveness value', () => {
    const result = normalizeNotificationSettings({ intrusiveness: 'popup' })
    expect(result.intrusiveness).toBe('toast')
  })

  it('rejects an invalid bellVisibility value', () => {
    const result = normalizeNotificationSettings({ bellVisibility: 'nonsense' })
    expect(result.bellVisibility).toBe('hideEmpty')
  })

  it('keeps valid boolean flags', () => {
    const result = normalizeNotificationSettings({ vibrate: true, sound: true, browserPush: true, enabled: false })
    expect(result).toMatchObject({ vibrate: true, sound: true, browserPush: true, enabled: false })
  })

  it('handles a non-object input', () => {
    expect(normalizeNotificationSettings(null)).toEqual(defaultNotificationSettings())
  })
})
