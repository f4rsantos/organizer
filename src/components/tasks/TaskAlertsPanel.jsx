import { useEffect, useMemo, useRef, useState } from 'react'
import { BellRing, Clock3, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTeamUserId, entityTeamId } from '@/hooks/useTeamIdentity'
import {
  buildScheduledTaskReminderTag,
  clearScheduledTaskReminders,
  reconcileScheduledTaskReminders,
  supportsOfflineTaskReminderScheduling,
  triggerTaskDueNotification,
} from '@/components/focus/focusAlerts'
import {
  dueDateToKey,
  dueOffsetReminders,
  nextDateKey,
  toDateFromKey,
  toDateKey,
  toMinutes,
  upcomingScheduledReminders,
} from '@/lib/taskReminders'

const DEFAULT_OFFSETS = [0]
const MAX_SCHEDULED_REMINDERS = 30

function canShowAlert(state, nowMinutes) {
  if (!state || state.hidden !== true) return true
  if (!state.remindAt) return false
  const remindAtMinutes = toMinutes(state.remindAt)
  if (remindAtMinutes === null) return false
  return nowMinutes >= remindAtMinutes
}

export function TaskAlertsPanel({ tasks, classNameById }) {
  const teamUserId = useTeamUserId()
  const taskAlertMode = useStore(s => s.settings?.taskAlertMode ?? 'none')
  const taskAlertNextDayTime = useStore(s => s.settings?.taskAlertNextDayTime ?? '18:00')
  const taskAlertStates = useStore(s => s.taskAlertStates ?? {})
  const reminderOffsets = useStore(s => s.settings?.taskReminderOffsets) ?? DEFAULT_OFFSETS
  const reminderOffsetTime = useStore(s => s.settings?.taskReminderTime ?? '09:00')
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

  // Shared tasks come from different teams, so doneBy has to be read with the
  // identity for that task's team rather than one id for the whole panel.
  const isTaskDone = task => (task?.sharedMeta?.remote
    ? !!task.doneForAll || !!task?.doneBy?.[teamUserId(entityTeamId(task))]
    : !!task.done)

  const dueToday = useMemo(() => {
    return (tasks ?? [])
      .filter(task => {
        return !isTaskDone(task) && dueDateToKey(task.dueDate) === todayKey
      })
      .map(task => ({
        task,
        className: task.classId ? (classNameById?.[task.classId] ?? 'Other') : 'Other',
      }))
      .filter(({ task }) => canShowAlert(taskAlertStates[`${task.id}:${todayKey}`], nowMinutes))
  }, [tasks, classNameById, taskAlertStates, todayKey, nowMinutes, isTaskDone])

  const showInApp = taskAlertMode === 'in-app' || taskAlertMode === 'both'
  const showNotification = taskAlertMode === 'notification' || taskAlertMode === 'both'
  const supportsOfflineSchedule = supportsOfflineTaskReminderScheduling()

  const nowMs = today.getTime()

  const leadReminders = useMemo(() => {
    if (taskAlertMode === 'none') return []
    return dueOffsetReminders({
      tasks,
      offsets: reminderOffsets,
      time: reminderOffsetTime,
      now: nowMs,
      alertStates: taskAlertStates,
      isDone: isTaskDone,
    })
      .filter(moment => moment.dueKey !== todayKey)
      .map(moment => {
        const task = (tasks ?? []).find(x => x?.id === moment.taskId)
        return {
          ...moment,
          className: task?.classId ? (classNameById?.[task.classId] ?? 'Other') : 'Other',
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, reminderOffsets, reminderOffsetTime, taskAlertStates, taskAlertMode, todayKey, nowMs, isTaskDone, teamUserId])

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
    if (!showNotification) return

    leadReminders.forEach(moment => {
      if (notifiedRef.current.has(moment.stateKey)) return
      notifiedRef.current.add(moment.stateKey)
      triggerTaskDueNotification({
        lang,
        title: moment.taskName,
        body: t.taskReminderIn(moment.offset),
      })
    })
  }, [leadReminders, showNotification, lang, t])

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
          ? !!task.doneForAll || !!task?.doneBy?.[teamUserId(entityTeamId(task))]
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

    const leadScheduled = upcomingScheduledReminders({
      tasks,
      offsets: reminderOffsets,
      time: reminderOffsetTime,
      now,
      isDone: isTaskDone,
      limit: MAX_SCHEDULED_REMINDERS,
    }).map(moment => ({
      tag: moment.tag,
      taskName: moment.taskName,
      timestamp: moment.timestamp,
    }))

    const byTag = new Map()
    for (const reminder of [...reminders, ...leadScheduled]) {
      if (!byTag.has(reminder.tag)) byTag.set(reminder.tag, reminder)
    }

    reconcileScheduledTaskReminders({
      lang,
      reminders: [...byTag.values()].sort((a, b) => a.timestamp - b.timestamp),
      maxReminders: MAX_SCHEDULED_REMINDERS,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tasks,
    taskAlertStates,
    reminderOffsets,
    reminderOffsetTime,
    showNotification,
    supportsOfflineSchedule,
    todayKey,
    tomorrowKey,
    taskAlertNextDayTime,
    lang,
    teamUserId,
  ])

  if (!showInApp || (dueToday.length === 0 && leadReminders.length === 0)) return null

  const handleHide = taskId => dismissTaskAlert(taskId, todayKey)

  const handleHideLead = moment => dismissTaskAlert(moment.taskId, `${moment.dueKey}:o${moment.offset}`)

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
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <BellRing className="h-4 w-4" />
        <span className="text-sm font-medium">{t.taskDueTodayTitle(dueToday.length + leadReminders.length)}</span>
      </div>

      <div className="space-y-2">
        {leadReminders.map(moment => (
          <div key={moment.stateKey} className="rounded-lg border border-border bg-background/80 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{moment.taskName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {moment.className} · {t.taskReminderIn(moment.offset)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleHideLead(moment)}
                title={t.taskAlertHide}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {dueToday.map(({ task, className }) => (
          <div key={task.id} className="rounded-lg border border-border bg-background/80 p-2.5">
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
