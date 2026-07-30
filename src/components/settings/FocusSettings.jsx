import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { requestBrowserNotificationPermission } from '@/components/focus/focusAlerts'

export function FocusSettings() {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const focus = useStore(s => s.settings?.focus ?? {})
  const updateFocusSettings = useStore(s => s.updateFocusSettings)
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
        <Select value={focusAlertMode} onValueChange={handleFocusAlertModeChange} items={focusAlertOptions}>
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
          items={[{ value: 'reset', label: t.focusAfterBreakReset }, { value: 'continue', label: t.focusAfterBreakContinue }]}
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
    </div>
  )
}
