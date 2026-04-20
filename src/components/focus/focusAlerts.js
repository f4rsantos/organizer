import { Howler } from 'howler'

const NOTIFICATION_MODES = new Set(['notification', 'both'])
const VIBRATION_MODES = new Set(['vibration', 'both'])
const TASK_REMINDER_TITLE_EN = 'Task Reminder'
const TASK_REMINDER_TITLE_PT = 'Lembrete de tarefa'
const TASK_REMINDER_TAG_PREFIX = 'organiser-task-scheduled:'

function playPingWithHowler() {
  const ctx = Howler.ctx
  if (!ctx) return

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, ctx.currentTime)

  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.23)
}

function showBrowserNotification({ phase, lang }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const isPt = lang === 'pt'
  const title = isPt ? 'Organizador Focus' : 'Organiser Focus'
  const body = phase === 'break'
    ? (isPt ? 'Hora da pausa pomodoro.' : 'Time for your pomodoro break.')
    : (isPt ? 'De volta ao foco.' : 'Back to focus.')

  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'organiser-focus-alert',
      renotify: true,
    })
  } catch {
  }
}

export function requestBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'default') return
  Notification.requestPermission().catch(() => {})
}

export function triggerFocusAlert({ mode, phase, lang }) {
  if (!mode || mode === 'none') return

  if (VIBRATION_MODES.has(mode) && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    if (phase === 'break') navigator.vibrate([22, 55, 22])
    if (phase === 'focus') navigator.vibrate(24)
  }

  if (NOTIFICATION_MODES.has(mode)) {
    playPingWithHowler()
    showBrowserNotification({ phase, lang })
  }
}

export function triggerTaskDueNotification({ lang, title, body }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    playPingWithHowler()
    const isPt = lang === 'pt'
    new Notification(isPt ? 'Organizador Tarefas' : 'Organiser Tasks', {
      body: body ? `${title} - ${body}` : title,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `organiser-task-due-${title}`,
      renotify: false,
    })
  } catch {
  }
}

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
  return lang === 'pt' ? TASK_REMINDER_TITLE_PT : TASK_REMINDER_TITLE_EN
}

async function ensureNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const permission = await Notification.requestPermission().catch(() => 'denied')
  return permission === 'granted'
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
