import { upcomingScheduledReminders } from '@/lib/taskReminders'

export function upcomingTaskNotifications({ tasks, offsets, time, now = Date.now(), isDone, limit = 30 }) {
  return upcomingScheduledReminders({ tasks, offsets, time, now, isDone, limit }).map(moment => ({
    id: moment.stateKey,
    tag: moment.tag,
    source: 'task',
    title: moment.taskName,
    timestamp: moment.timestamp,
  }))
}
