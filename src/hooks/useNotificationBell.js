import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { getNotificationSettings } from '@/lib/notifications/settings'
import { upcomingTaskNotifications } from '@/lib/notifications/upcoming'
import { hasUnread } from '@/lib/notifications/queue'

export function useNotificationBell() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const settings = useStore(s => s.settings)
  const notifications = getNotificationSettings(settings)
  const unread = useStore(s => s.notificationQueue?.unread ?? [])
  const tasks = useStore(s => s.tasks ?? [])
  const taskAlertsEnabled = useStore(s => s.settings?.taskAlertsEnabled ?? false)
  const reminderOffsets = useStore(s => s.settings?.taskReminderOffsets ?? [0])
  const reminderOffsetTime = useStore(s => s.settings?.taskReminderTime ?? '09:00')

  const upcoming = useMemo(() => {
    if (!taskAlertsEnabled) return []
    return upcomingTaskNotifications({
      tasks,
      offsets: reminderOffsets,
      time: reminderOffsetTime,
      isDone: task => Boolean(task?.done),
      limit: 10,
    })
  }, [tasks, taskAlertsEnabled, reminderOffsets, reminderOffsetTime])

  const queue = useStore(s => s.notificationQueue)
  const anyUnread = hasUnread(queue)

  const shouldShowBell = (() => {
    if (!notifications.enabled) return false
    if (notifications.bellVisibility === 'always') return true
    if (notifications.bellVisibility === 'hideEmpty') return anyUnread
    return anyUnread || upcoming.length > 0
  })()

  return {
    t,
    shouldShowBell,
    hasUnread: anyUnread,
    unread,
    upcoming,
  }
}
