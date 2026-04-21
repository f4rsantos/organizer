import { Circle, CircleCheck } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { requestBrowserNotificationPermission } from '@/components/focus/focusAlerts'

export function GeneralSettings() {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const pomodoroEnabled = useStore(s => s.settings?.pomodoro?.enabled ?? false)
  const updatePomodoroSettings = useStore(s => s.updatePomodoroSettings)
  const workMode = useStore(s => s.settings?.workMode ?? false)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const kanbanChecklistPreviewMode = settings.kanbanChecklistPreviewMode
    ?? (settings.kanbanShowChecklistInline ? 'all' : 'none')
  const taskAlertMode = settings.taskAlertMode ?? 'none'
  const taskAlertNextDayTime = settings.taskAlertNextDayTime ?? '18:00'
  const focusAlertMode = settings.focusAlertMode ?? (settings.vibrateOnPageFocus ? 'vibration' : 'none')

  const spanOptions = [
    { value: 'single', label: t.spanSingle },
    { value: 'perWeek', label: t.spanPerWeek },
  ]

  const focusAlertOptions = [
    { value: 'none', label: t.focusAlertNone },
    { value: 'vibration', label: t.focusAlertVibration },
    { value: 'notification', label: t.focusAlertNotification },
    { value: 'both', label: t.focusAlertBoth },
  ]

  const taskAlertOptions = [
    { value: 'none', label: t.taskAlertNone },
    { value: 'in-app', label: t.taskAlertInApp },
    { value: 'notification', label: t.taskAlertNotification },
    { value: 'both', label: t.taskAlertBoth },
  ]

  const kanbanChecklistPreviewOptions = [
    { value: 'none', label: t.kanbanChecklistPreviewNone },
    { value: 'all', label: t.kanbanChecklistPreviewAll },
    { value: 'card', label: t.kanbanChecklistPreviewPerCard },
  ]

  const handleFocusAlertModeChange = value => {
    updateSettings({ focusAlertMode: value })
    if (value === 'notification' || value === 'both') {
      requestBrowserNotificationPermission()
    }
  }

  const handleTaskAlertModeChange = value => {
    updateSettings({ taskAlertMode: value })
    if (value === 'notification' || value === 'both') {
      requestBrowserNotificationPermission()
    }
  }

  const handleTaskAlertNextDayTime = value => {
    updateSettings({ taskAlertNextDayTime: value || '18:00' })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t.taskSpanLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.taskSpanDesc}</p>
        <Select value={settings.taskSpanMode ?? 'single'} onValueChange={v => updateSettings({ taskSpanMode: v })}>
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
        <Label>{t.kanbanChecklistInlineLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.kanbanChecklistInlineDesc}</p>
        <Select value={kanbanChecklistPreviewMode} onValueChange={v => updateSettings({ kanbanChecklistPreviewMode: v })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {kanbanChecklistPreviewOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t.pomodoroMode}</Label>
        <p className="text-xs text-muted-foreground">{t.pomodoroModeDesc}</p>
        <button type="button" onClick={() => updatePomodoroSettings({ enabled: !pomodoroEnabled })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {pomodoroEnabled
            ? <CircleCheck className="h-4 w-4 text-primary" />
            : <Circle className="h-4 w-4" />}
          {pomodoroEnabled ? t.settingEnabled : t.settingDisabled}
        </button>
      </div>

      <div className="space-y-1.5">
        <Label>{t.workModeLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.workModeDesc}</p>
        <button type="button" onClick={() => updateSettings({ workMode: !workMode })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {workMode
            ? <CircleCheck className="h-4 w-4 text-primary" />
            : <Circle className="h-4 w-4" />}
          {workMode ? t.settingEnabled : t.settingDisabled}
        </button>
      </div>

      <div className="space-y-1.5">
        <Label>{t.focusAlertModeLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.focusAlertModeDesc}</p>
        <Select value={focusAlertMode} onValueChange={handleFocusAlertModeChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {focusAlertOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t.taskAlertModeLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.taskAlertModeDesc}</p>
        <Select value={taskAlertMode} onValueChange={handleTaskAlertModeChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {taskAlertOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(taskAlertMode === 'notification' || taskAlertMode === 'both') && (
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
    </div>
  )
}
