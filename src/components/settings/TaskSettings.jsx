import { useState } from 'react'
import { Circle, CircleCheck, Plus, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { NotificationDeliverySettings } from '@/components/settings/notifications/NotificationDeliverySettings'

export function TaskSettings() {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const taskAlertsEnabled = settings.taskAlertsEnabled ?? false
  const taskAlertsInApp = settings.taskAlertsInApp ?? true
  const taskAlertNextDayTime = settings.taskAlertNextDayTime ?? '18:00'
  const taskDefaultToCalendar = settings.taskDefaultToCalendar ?? false
  const taskTimes = settings.taskTimes ?? false
  const hideCompletedTasks = settings.hideCompletedTasks ?? false
  const reminderOffsets = settings.taskReminderOffsets ?? [0]
  const taskReminderTime = settings.taskReminderTime ?? '09:00'
  const [newOffset, setNewOffset] = useState('')

  const addOffset = () => {
    const parsed = Number(newOffset)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 365) return
    const next = [...new Set([...reminderOffsets, Math.trunc(parsed)])].sort((a, b) => b - a).slice(0, 8)
    updateSettings({ taskReminderOffsets: next })
    setNewOffset('')
  }

  const removeOffset = offset => {
    updateSettings({ taskReminderOffsets: reminderOffsets.filter(o => o !== offset) })
  }

  const spanOptions = [
    { value: 'single', label: t.spanSingle },
    { value: 'perWeek', label: t.spanPerWeek },
  ]

  const handleTaskAlertNextDayTime = value => {
    updateSettings({ taskAlertNextDayTime: value || '18:00' })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t.taskSpanLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.taskSpanDesc}</p>
        <Select value={settings.taskSpanMode ?? 'single'} onValueChange={v => updateSettings({ taskSpanMode: v })} items={spanOptions}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {spanOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t.taskDefaultToCalendarLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.taskDefaultToCalendarDesc}</p>
        <button type="button" onClick={() => updateSettings({ taskDefaultToCalendar: !taskDefaultToCalendar })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {taskDefaultToCalendar
            ? <CircleCheck className="h-4 w-4 text-primary" />
            : <Circle className="h-4 w-4" />}
          {taskDefaultToCalendar ? t.settingEnabled : t.settingDisabled}
        </button>
      </div>

      <div className="space-y-1.5">
        <Label>{t.taskTimesLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.taskTimesDesc}</p>
        <button type="button" onClick={() => updateSettings({ taskTimes: !taskTimes })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {taskTimes
            ? <CircleCheck className="h-4 w-4 text-primary" />
            : <Circle className="h-4 w-4" />}
          {taskTimes ? t.settingEnabled : t.settingDisabled}
        </button>
      </div>

      <div className="space-y-1.5">
        <Label>{t.hideCompletedTasksLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.hideCompletedTasksDesc}</p>
        <button type="button" onClick={() => updateSettings({ hideCompletedTasks: !hideCompletedTasks })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {hideCompletedTasks
            ? <CircleCheck className="h-4 w-4 text-primary" />
            : <Circle className="h-4 w-4" />}
          {hideCompletedTasks ? t.settingEnabled : t.settingDisabled}
        </button>
      </div>

      <div className="space-y-1.5">
        <Label>{t.taskAlertModeLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.taskAlertModeDesc}</p>
        <button type="button" onClick={() => updateSettings({ taskAlertsEnabled: !taskAlertsEnabled })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {taskAlertsEnabled
            ? <CircleCheck className="h-4 w-4 text-primary" />
            : <Circle className="h-4 w-4" />}
          {taskAlertsEnabled ? t.settingEnabled : t.settingDisabled}
        </button>
      </div>

      {taskAlertsEnabled && (
        <div className="space-y-1.5">
          <Label>{t.taskAlertInAppLabel}</Label>
          <p className="text-xs text-muted-foreground">{t.taskAlertInAppDesc}</p>
          <button type="button" onClick={() => updateSettings({ taskAlertsInApp: !taskAlertsInApp })}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {taskAlertsInApp
              ? <CircleCheck className="h-4 w-4 text-primary" />
              : <Circle className="h-4 w-4" />}
            {taskAlertsInApp ? t.settingEnabled : t.settingDisabled}
          </button>
        </div>
      )}

      {taskAlertsEnabled && <NotificationDeliverySettings />}

      {taskAlertsEnabled && (
        <div className="space-y-1.5">
          <Label>{t.taskAlertNextDayTimeLabel}</Label>
          <p className="text-xs text-muted-foreground">{t.taskAlertNextDayTimeDesc}</p>
          <Input
            type="time"
            value={taskAlertNextDayTime}
            onChange={e => handleTaskAlertNextDayTime(e.target.value)}
            className="w-full"
          />
        </div>
      )}

      {taskAlertsEnabled && (
        <>
          <div className="space-y-1.5">
            <Label>{t.taskReminderOffsetsLabel}</Label>
            <p className="text-xs text-muted-foreground">{t.taskReminderOffsetsDesc}</p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {reminderOffsets.map(offset => (
                <span key={offset}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs">
                  {t.taskReminderOffsetDays(offset)}
                  <button type="button" onClick={() => removeOffset(offset)}
                    className="text-muted-foreground hover:text-destructive transition-colors" title={t.delete}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Input
                type="number"
                min="0"
                max="365"
                value={newOffset}
                onChange={e => setNewOffset(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addOffset()}
                placeholder={t.taskReminderAddOffset}
                className="h-8 w-32"
              />
              <Button variant="outline" size="sm" className="h-8" onClick={addOffset} disabled={newOffset === ''}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t.taskReminderTimeLabel}</Label>
            <p className="text-xs text-muted-foreground">{t.taskReminderTimeDesc}</p>
            <Input
              type="time"
              value={taskReminderTime}
              onChange={e => updateSettings({ taskReminderTime: e.target.value || '09:00' })}
              className="w-full"
            />
          </div>
        </>
      )}
    </div>
  )
}
