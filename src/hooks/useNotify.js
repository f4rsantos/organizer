import { useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { getNotificationSettings } from '@/lib/notifications/settings'
import { dispatchNotification } from '@/lib/notifications/dispatch'

export function useNotify() {
  const queueNotification = useStore(s => s.queueNotification)

  return useCallback((entry, { vibratePattern } = {}) => {
    const settings = getNotificationSettings(useStore.getState().settings)
    if (!settings.enabled) return

    const id = entry.id ?? `${entry.tag ?? 'notif'}:${Date.now()}`
    queueNotification({ ...entry, id }, settings.intrusiveness)
    dispatchNotification({
      settings,
      title: entry.title,
      body: entry.body,
      tag: entry.tag,
      vibratePattern,
    })
  }, [queueNotification])
}
