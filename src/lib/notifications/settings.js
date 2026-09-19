export const NOTIFICATION_INTRUSIVENESS = ['toast', 'alert']
export const NOTIFICATION_BELL_VISIBILITY = ['always', 'hideEmpty', 'hideNone']

export function defaultNotificationSettings() {
  return {
    enabled: true,
    intrusiveness: 'toast',
    vibrate: false,
    sound: false,
    browserPush: false,
    bellVisibility: 'hideEmpty',
  }
}

export function getNotificationSettings(settings) {
  return { ...defaultNotificationSettings(), ...(settings?.notifications ?? {}) }
}

export function normalizeNotificationSettings(notifications) {
  const n = notifications && typeof notifications === 'object' ? notifications : {}
  const defaults = defaultNotificationSettings()
  return {
    enabled: typeof n.enabled === 'boolean' ? n.enabled : defaults.enabled,
    intrusiveness: NOTIFICATION_INTRUSIVENESS.includes(n.intrusiveness) ? n.intrusiveness : defaults.intrusiveness,
    vibrate: typeof n.vibrate === 'boolean' ? n.vibrate : defaults.vibrate,
    sound: typeof n.sound === 'boolean' ? n.sound : defaults.sound,
    browserPush: typeof n.browserPush === 'boolean' ? n.browserPush : defaults.browserPush,
    bellVisibility: NOTIFICATION_BELL_VISIBILITY.includes(n.bellVisibility) ? n.bellVisibility : defaults.bellVisibility,
  }
}
