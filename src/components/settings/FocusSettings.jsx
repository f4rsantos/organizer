import { Circle, CircleCheck } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { requestBrowserNotificationPermission } from '@/components/focus/focusAlerts'
import { PomodoroSettings } from './PomodoroSettings'

export function FocusSettings() {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const focus = useStore(s => s.settings?.focus ?? {})
  const updateFocusSettings = useStore(s => s.updateFocusSettings)
  const pomodoroEnabled = useStore(s => s.settings?.pomodoro?.enabled ?? false)
  const updatePomodoroSettings = useStore(s => s.updatePomodoroSettings)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const focusAlertMode = settings.focusAlertMode ?? (settings.vibrateOnPageFocus ? 'vibration' : 'none')

  const focusAlertOptions = [
    { value: 'none', label: t.focusAlertNone },
    { value: 'vibration', label: t.focusAlertVibration },
    { value: 'notification', label: t.focusAlertNotification },
    { value: 'both', label: t.focusAlertBoth },
  ]

  const handleFocusAlertModeChange = value => {
    updateSettings({ focusAlertMode: value })
    if (value === 'notification' || value === 'both') {
      requestBrowserNotificationPermission()
    }
  }

  return (
    <div className="space-y-4">
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
        <Label>{lang === 'pt' ? 'Após pausa' : 'After break'}</Label>
        <Select
          value={focus.intervalResetMode ?? 'reset'}
          onValueChange={value => updateFocusSettings({ intervalResetMode: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            <SelectItem value="reset">{t.focusAfterBreakReset}</SelectItem>
            <SelectItem value="continue">{t.focusAfterBreakContinue}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t.pomodoroMode}</Label>
        <p className="text-xs text-muted-foreground">{t.pomodoroModeDesc}</p>
        <button
          type="button"
          onClick={() => updatePomodoroSettings({ enabled: !pomodoroEnabled })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {pomodoroEnabled
            ? <CircleCheck className="h-4 w-4 text-primary" />
            : <Circle className="h-4 w-4" />}
          {pomodoroEnabled ? t.settingEnabled : t.settingDisabled}
        </button>
      </div>

      {pomodoroEnabled && (
        <div className="pt-1 border-t border-border/40">
          <PomodoroSettings />
        </div>
      )}
    </div>
  )
}
