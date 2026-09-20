import { useEffect, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { getNotificationSettings } from '@/lib/notifications/settings'
import { ToastStack, AUTO_DISMISS_MS } from './ToastStack'
import { CenterAlert } from './CenterAlert'

export function NotificationsHost() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const rawNotificationSettings = useStore(s => s.settings?.notifications)
  const notifications = useMemo(() => getNotificationSettings({ notifications: rawNotificationSettings }), [rawNotificationSettings])
  const toasts = useStore(s => s.notificationQueue?.toasts ?? [])
  const activeAlert = useStore(s => s.notificationQueue?.activeAlert ?? null)
  const dismissNotificationToast = useStore(s => s.dismissNotificationToast)
  const readNotificationToast = useStore(s => s.readNotificationToast)
  const dismissActiveNotificationAlert = useStore(s => s.dismissActiveNotificationAlert)

  useEffect(() => {
    if (!toasts.length) return
    const timers = toasts.map(toast => setTimeout(() => dismissNotificationToast(toast.id), AUTO_DISMISS_MS))
    return () => timers.forEach(clearTimeout)
  }, [toasts, dismissNotificationToast])

  if (!notifications.enabled) return null

  return (
    <>
      {notifications.intrusiveness === 'toast' && (
        <ToastStack toasts={toasts} onDismiss={readNotificationToast} />
      )}
      {notifications.intrusiveness === 'alert' && (
        <CenterAlert alert={activeAlert} dismissLabel={t.notificationDismiss} onDismiss={dismissActiveNotificationAlert} />
      )}
    </>
  )
}
