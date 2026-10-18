import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SettingList, SettingRow, SettingSelect, SettingToggle } from './SettingRow'
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
    <SettingList>
      <SettingSelect label={t.taskSpanLabel} desc={t.taskSpanDesc} value={settings.taskSpanMode ?? 'single'}
        onChange={v => updateSettings({ taskSpanMode: v })} options={spanOptions} />

      <SettingToggle label={t.taskDefaultToCalendarLabel} desc={t.taskDefaultToCalendarDesc} checked={taskDefaultToCalendar} onChange={v => updateSettings({ taskDefaultToCalendar: v })} />

      <SettingToggle label={t.taskTimesLabel} desc={t.taskTimesDesc} checked={taskTimes} onChange={v => updateSettings({ taskTimes: v })} />

      <SettingToggle label={t.hideCompletedTasksLabel} desc={t.hideCompletedTasksDesc} checked={hideCompletedTasks} onChange={v => updateSettings({ hideCompletedTasks: v })} />

      <SettingToggle label={t.taskAlertModeLabel} desc={t.taskAlertModeDesc} checked={taskAlertsEnabled} onChange={v => updateSettings({ taskAlertsEnabled: v })} />

      {taskAlertsEnabled && (
        <SettingToggle label={t.taskAlertInAppLabel} desc={t.taskAlertInAppDesc} checked={taskAlertsInApp} onChange={v => updateSettings({ taskAlertsInApp: v })} />
      )}

      {taskAlertsEnabled && <NotificationDeliverySettings />}

      {taskAlertsEnabled && (
        <SettingRow label={t.taskAlertNextDayTimeLabel} desc={t.taskAlertNextDayTimeDesc} control={
          <Input type="time" value={taskAlertNextDayTime} onChange={e => handleTaskAlertNextDayTime(e.target.value)} className="h-8 w-28" />
        } />
      )}

      {taskAlertsEnabled && (
        <>
          <SettingRow label={t.taskReminderOffsetsLabel} desc={t.taskReminderOffsetsDesc}>
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
          </SettingRow>

          <SettingRow label={t.taskReminderTimeLabel} desc={t.taskReminderTimeDesc} control={
            <Input type="time" value={taskReminderTime} onChange={e => updateSettings({ taskReminderTime: e.target.value || '09:00' })} className="h-8 w-28" />
          } />
        </>
      )}
    </SettingList>
  )
}
