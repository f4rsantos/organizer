import { useEffect, useMemo, useRef, useState } from 'react'
import { BellRing, Clock3, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  buildScheduledTaskReminderTag,
  clearScheduledTaskReminders,
  reconcileScheduledTaskReminders,
  supportsOfflineTaskReminderScheduling,
  triggerTaskDueNotification,
} from '@/components/focus/focusAlerts'

function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dueDateToKey(dueDate) {
  if (!dueDate) return null

  if (dueDate instanceof Date && !Number.isNaN(dueDate.getTime())) {
    return toDateKey(dueDate)
  }

  if (typeof dueDate === 'string') {
    const trimmed = dueDate.trim()
    if (!trimmed) return null

    // Supports plain date input (`YYYY-MM-DD`) and ISO timestamps.
    const first10 = trimmed.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(first10)) return first10

    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) return toDateKey(parsed)
  }

  return null
}

function toDateFromKey(dateKey) {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null
  const parsed = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function nextDateKey(date) {
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  return toDateKey(next)
}

function toMinutes(time) {
  if (!time || typeof time !== 'string' || !time.includes(':')) return null
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function canShowAlert(state, nowMinutes) {
  if (!state || state.hidden !== true) return true
  if (!state.remindAt) return false
  const remindAtMinutes = toMinutes(state.remindAt)
  if (remindAtMinutes === null) return false
  return nowMinutes >= remindAtMinutes
}

export function TaskAlertsPanel({ tasks, classNameById }) {
  const userId = useStore(s => s.collab?.userId)
  const taskAlertMode = useStore(s => s.settings?.taskAlertMode ?? 'none')
  const taskAlertNextDayTime = useStore(s => s.settings?.taskAlertNextDayTime ?? '18:00')
  const taskAlertStates = useStore(s => s.taskAlertStates ?? {})
  const dismissTaskAlert = useStore(s => s.dismissTaskAlert)
  const setTaskAlertReminder = useStore(s => s.setTaskAlertReminder)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const notifiedRef = useRef(new Set())
  const [timeByTask, setTimeByTask] = useState({})
  const [reminderTask, setReminderTask] = useState(null)
  const [reminderTime, setReminderTime] = useState('')

  const today = new Date()
  const todayKey = toDateKey(today)
  const tomorrowKey = nextDateKey(today)
  const nowMinutes = today.getHours() * 60 + today.getMinutes()

  const dueToday = useMemo(() => {
    return (tasks ?? [])
      .filter(task => {
        const done = task?.sharedMeta?.remote
          ? !!task.doneForAll || !!task?.doneBy?.[userId]
          : !!task.done
        return !done && dueDateToKey(task.dueDate) === todayKey
      })
      .map(task => ({
        task,
        className: task.classId ? (classNameById?.[task.classId] ?? 'Other') : 'Other',
      }))
      .filter(({ task }) => canShowAlert(taskAlertStates[`${task.id}:${todayKey}`], nowMinutes))
  }, [tasks, classNameById, taskAlertStates, todayKey, nowMinutes, userId])

  const showInApp = taskAlertMode === 'in-app' || taskAlertMode === 'both'
  const showNotification = taskAlertMode === 'notification' || taskAlertMode === 'both'
  const supportsOfflineSchedule = supportsOfflineTaskReminderScheduling()

  useEffect(() => {
    if (!showNotification || supportsOfflineSchedule) return

    dueToday.forEach(({ task, className }) => {
      const key = `${todayKey}:${task.id}`
      if (notifiedRef.current.has(key)) return

      notifiedRef.current.add(key)
      triggerTaskDueNotification({
        lang,
        title: task.title,
        body: className,
      })
    })
  }, [dueToday, showNotification, supportsOfflineSchedule, todayKey, lang])

  useEffect(() => {
    if (!showNotification || !supportsOfflineSchedule) {
      clearScheduledTaskReminders()
      return
    }

    const now = Date.now()
    const defaultTodayHour = 9
    const defaultTodayMinute = 0
    const nextDayMinutes = toMinutes(taskAlertNextDayTime)
    const nextDayHour = nextDayMinutes == null ? 18 : Math.floor(nextDayMinutes / 60)
    const nextDayMinute = nextDayMinutes == null ? 0 : nextDayMinutes % 60

    const reminders = (tasks ?? [])
      .map(task => {
        const done = task?.sharedMeta?.remote
          ? !!task.doneForAll || !!task?.doneBy?.[userId]
          : !!task.done
        if (done) return null

        const dueKey = dueDateToKey(task?.dueDate)
        if (!dueKey || (dueKey !== todayKey && dueKey !== tomorrowKey)) return null

        const dueDate = toDateFromKey(dueKey)
        if (!dueDate) return null

        const state = taskAlertStates[`${task.id}:${dueKey}`]
        const remindAtMinutes = toMinutes(state?.remindAt)
        const useNextDayDefault = dueKey === tomorrowKey && remindAtMinutes == null
        const hours = useNextDayDefault
          ? nextDayHour
          : (remindAtMinutes == null ? defaultTodayHour : Math.floor(remindAtMinutes / 60))
        const minutes = useNextDayDefault
          ? nextDayMinute
          : (remindAtMinutes == null ? defaultTodayMinute : remindAtMinutes % 60)
        const scheduledAt = new Date(dueDate)
        scheduledAt.setHours(hours, minutes, 0, 0)

        let timestamp = scheduledAt.getTime()
        if (dueKey === todayKey && timestamp <= now) {
          timestamp = now + 30 * 1000
        }

        return {
          tag: buildScheduledTaskReminderTag(task.id, dueKey),
          taskName: task.title,
          timestamp,
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 10)

    reconcileScheduledTaskReminders({
      lang,
      reminders,
      maxReminders: 10,
    })
  }, [
    tasks,
    taskAlertStates,
    showNotification,
    supportsOfflineSchedule,
    todayKey,
    tomorrowKey,
    taskAlertNextDayTime,
    lang,
    userId,
  ])

  if (!showInApp || dueToday.length === 0) return null

  const handleHide = taskId => dismissTaskAlert(taskId, todayKey)

  const handleRemindAt = taskId => {
    const time = reminderTime || timeByTask[taskId]
    if (!time) return
    setTaskAlertReminder(taskId, todayKey, time)
    setTimeByTask(prev => ({ ...prev, [taskId]: time }))
    setReminderTask(null)
    setReminderTime('')
  }

  const openReminder = taskId => {
    const state = taskAlertStates[`${taskId}:${todayKey}`]
    const initial = timeByTask[taskId] ?? state?.remindAt ?? ''
    setReminderTask(taskId)
    setReminderTime(initial)
  }

  return (
    <div className="rounded-xl border border-amber-300/50 bg-amber-50/70 p-3 space-y-2 dark:border-amber-500/30 dark:bg-amber-950/25">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
        <BellRing className="h-4 w-4" />
        <span className="text-sm font-medium">{t.taskDueTodayTitle(dueToday.length)}</span>
      </div>

      <div className="space-y-2">
        {dueToday.map(({ task, className }) => (
          <div key={task.id} className="rounded-lg border border-amber-300/40 bg-background/80 p-2.5 dark:border-amber-600/30">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <p className="text-xs text-muted-foreground truncate">{className}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => openReminder(task.id)}
                  title={t.taskAlertRemindMeAt}
                >
                  <Clock3 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleHide(task.id)}
                  title={t.taskAlertHide}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!reminderTask} onOpenChange={open => !open && setReminderTask(null)}>
        <DialogContent className="max-w-xs p-4" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t.taskAlertRemindMeAt}</DialogTitle>
          </DialogHeader>
          <Input
            type="time"
            className="h-9"
            value={reminderTime}
            onChange={e => setReminderTime(e.target.value)}
          />
          <DialogFooter className="-mx-4 -mb-4">
            <Button variant="ghost" onClick={() => setReminderTask(null)}>{t.cancel}</Button>
            <Button onClick={() => handleRemindAt(reminderTask)} disabled={!reminderTask || !reminderTime}>{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
