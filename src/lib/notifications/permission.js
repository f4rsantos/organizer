export function hasNotificationSupport() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission() {
  if (!hasNotificationSupport()) return 'unsupported'
  return Notification.permission
}

export function requestNotificationPermission() {
  if (!hasNotificationSupport()) return
  if (Notification.permission !== 'default') return
  Notification.requestPermission().catch(() => {})
}

export async function ensureNotificationPermission() {
  if (!hasNotificationSupport()) return false
  if (Notification.permission === 'granted') return true
  const permission = await Notification.requestPermission().catch(() => 'denied')
  return permission === 'granted'
}

export function canShowBrowserNotification() {
  return hasNotificationSupport() && Notification.permission === 'granted'
}

export function showBrowserNotification({ title, body, tag, renotify = false, iconPath = 'favicon.svg' }) {
  if (!canShowBrowserNotification()) return
  try {
    const base = typeof import.meta !== 'undefined' ? (import.meta.env?.BASE_URL ?? '/') : '/'
    new Notification(title, {
      body,
      icon: `${base}${iconPath}`,
      badge: `${base}${iconPath}`,
      tag,
      renotify,
    })
  } catch {
    return
  }
}
