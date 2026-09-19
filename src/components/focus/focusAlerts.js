import { useStrings as stringsFor } from '@/lib/strings'
import { ensureNotificationPermission } from '@/lib/notifications/permission'

const TASK_REMINDER_TAG_PREFIX = 'organiser-task-scheduled:'

export function buildScheduledTaskReminderTag(taskId, dueDateKey) {
  return `${TASK_REMINDER_TAG_PREFIX}${taskId}:${dueDateKey}`
}

export function supportsOfflineTaskReminderScheduling() {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window)) return false
  if (!('serviceWorker' in navigator)) return false
  return typeof window.TimestampTrigger === 'function'
}

function getTaskReminderTitle(lang) {
  return stringsFor(lang).taskReminderTitle
}

async function getServiceWorkerRegistration() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

export async function scheduleOfflineReminder({ lang, taskName, timestamp, notificationTag }) {
  if (!supportsOfflineTaskReminderScheduling()) return false
  if (!Number.isFinite(timestamp)) return false

  const hasPermission = await ensureNotificationPermission()
  if (!hasPermission) return false

  const registration = await getServiceWorkerRegistration()
  if (!registration) return false

  try {
    const existing = await registration.getNotifications({ tag: notificationTag })
    existing.forEach(notification => notification.close())

    const trigger = new window.TimestampTrigger(timestamp)
    await registration.showNotification(getTaskReminderTitle(lang), {
      body: taskName,
      tag: notificationTag,
      renotify: false,
      showTrigger: trigger,
    })
    return true
  } catch {
    return false
  }
}

export async function clearScheduledTaskReminders(tags = null) {
  const registration = await getServiceWorkerRegistration()
  if (!registration) return

  try {
    const notifications = await registration.getNotifications()
    notifications.forEach(notification => {
      const tag = notification.tag ?? ''
      if (!tag.startsWith(TASK_REMINDER_TAG_PREFIX)) return
      if (Array.isArray(tags) && tags.length > 0 && !tags.includes(tag)) return
      notification.close()
    })
  } catch {
    return
  }
}

export async function reconcileScheduledTaskReminders({ lang, reminders, maxReminders = 10 }) {
  if (!supportsOfflineTaskReminderScheduling()) return false

  const normalized = (reminders ?? [])
    .filter(reminder => reminder && reminder.tag && Number.isFinite(reminder.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, maxReminders)

  const desiredTags = new Set(normalized.map(reminder => reminder.tag))
  const registration = await getServiceWorkerRegistration()
  if (!registration) return false

  try {
    const existing = await registration.getNotifications()
    existing.forEach(notification => {
      const tag = notification.tag ?? ''
      if (!tag.startsWith(TASK_REMINDER_TAG_PREFIX)) return
      if (!desiredTags.has(tag)) notification.close()
    })
  } catch {
    return false
  }

  let scheduledAny = false
  for (const reminder of normalized) {
    const scheduled = await scheduleOfflineReminder({
      lang,
      taskName: reminder.taskName,
      timestamp: reminder.timestamp,
      notificationTag: reminder.tag,
    })
    scheduledAny = scheduledAny || scheduled
  }

  return scheduledAny
}
