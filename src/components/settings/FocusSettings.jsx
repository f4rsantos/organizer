import { Circle, CircleCheck } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { NotificationDeliverySettings } from '@/components/settings/notifications/NotificationDeliverySettings'

export function FocusSettings() {
  const focus = useStore(s => s.settings?.focus ?? {})
  const updateFocusSettings = useStore(s => s.updateFocusSettings)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const alertsEnabled = focus.alertsEnabled ?? true

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t.focusAlertsEnabledLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.focusAlertsEnabledDesc}</p>
        <button type="button" onClick={() => updateFocusSettings({ alertsEnabled: !alertsEnabled })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {alertsEnabled
            ? <CircleCheck className="h-4 w-4 text-primary" />
            : <Circle className="h-4 w-4" />}
          {alertsEnabled ? t.settingEnabled : t.settingDisabled}
        </button>
      </div>

      {alertsEnabled && <NotificationDeliverySettings />}

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
