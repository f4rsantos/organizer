const TASK_REMINDER_TAG_PREFIX = 'organiser-task-scheduled:'

export function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dueDateToKey(dueDate) {
  if (!dueDate) return null

  if (dueDate instanceof Date && !Number.isNaN(dueDate.getTime())) {
    return toDateKey(dueDate)
  }

  if (typeof dueDate === 'string') {
    const trimmed = dueDate.trim()
    if (!trimmed) return null

    const first10 = trimmed.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(first10)) return first10

    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) return toDateKey(parsed)
  }

  return null
}

export function toDateFromKey(dateKey) {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null
  const parsed = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export function nextDateKey(date) {
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  return toDateKey(next)
}

export function toMinutes(time) {
  if (!time || typeof time !== 'string' || !time.includes(':')) return null
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

export function buildOffsetReminderTag(taskId, dueDateKey, offset) {
  return `${TASK_REMINDER_TAG_PREFIX}${taskId}:${dueDateKey}:o${offset}`
}

export function offsetStateKey(taskId, dueDateKey, offset) {
  return `${taskId}:${dueDateKey}:o${offset}`
}

export function computeReminderMoments({ task, offsets, time }) {
  const dueKey = dueDateToKey(task?.dueDate)
  if (!dueKey) return []

  const dueDate = toDateFromKey(dueKey)
  if (!dueDate) return []

  const minutes = toMinutes(time)
  const hours = minutes == null ? 9 : Math.floor(minutes / 60)
  const mins = minutes == null ? 0 : minutes % 60

  const cleaned = (Array.isArray(offsets) ? offsets : [])
    .filter(o => Number.isFinite(o) && o >= 0)
    .map(o => Math.trunc(o))

  return [...new Set(cleaned)]
    .map(offset => {
      const at = new Date(dueDate)
      at.setDate(at.getDate() - offset)
      at.setHours(hours, mins, 0, 0)
      return {
        offset,
        dueKey,
        timestamp: at.getTime(),
        tag: buildOffsetReminderTag(task.id, dueKey, offset),
        stateKey: offsetStateKey(task.id, dueKey, offset),
        taskId: task.id,
        taskName: task.title,
      }
    })
    .filter(m => Number.isFinite(m.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)
}

function defaultIsDone(task) {
  return Boolean(task?.done)
}

function eligibleTasks(tasks, isDone) {
  return (Array.isArray(tasks) ? tasks : []).filter(task => {
    if (!task || typeof task !== 'object' || !task.id) return false
    if (!dueDateToKey(task.dueDate)) return false
    return !isDone(task)
  })
}

export function dueOffsetReminders({
  tasks, offsets, time, now = Date.now(), alertStates = {}, isDone = defaultIsDone,
}) {
  const out = []
  for (const task of eligibleTasks(tasks, isDone)) {
    const moments = computeReminderMoments({ task, offsets, time })
    for (const moment of moments) {
      if (moment.timestamp > now) continue
      if (alertStates[moment.stateKey]?.hidden === true) continue
      out.push(moment)
    }
  }
  return out.sort((a, b) => b.timestamp - a.timestamp)
}

export function upcomingScheduledReminders({
  tasks, offsets, time, now = Date.now(), isDone = defaultIsDone, limit = 30,
}) {
  const out = []
  for (const task of eligibleTasks(tasks, isDone)) {
    for (const moment of computeReminderMoments({ task, offsets, time })) {
      if (moment.timestamp <= now) continue
      out.push(moment)
    }
  }
  return out.sort((a, b) => a.timestamp - b.timestamp).slice(0, limit)
}
