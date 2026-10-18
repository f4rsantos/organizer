import { SettingList, SettingToggle } from './SettingRow'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { NotificationDeliverySettings } from '@/components/settings/notifications/NotificationDeliverySettings'

export function FocusSettings() {
  const focus = useStore(s => s.settings?.focus ?? {})
  const updateFocusSettings = useStore(s => s.updateFocusSettings)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const alertsEnabled = focus.alertsEnabled ?? true
  const floatingWidgetEnabled = focus.floatingWidgetEnabled ?? true

  return (
    <SettingList>
      <SettingToggle label={t.focusAlertsEnabledLabel} desc={t.focusAlertsEnabledDesc} checked={alertsEnabled}
        onChange={v => updateFocusSettings({ alertsEnabled: v })} />
      {alertsEnabled && <NotificationDeliverySettings />}
      <SettingToggle label={t.focusFloatingWidgetLabel} desc={t.focusFloatingWidgetDesc} checked={floatingWidgetEnabled}
        onChange={v => updateFocusSettings({ floatingWidgetEnabled: v })} />
      <SettingToggle label={t.focusAfterBreakContinue} checked={(focus.intervalResetMode ?? 'reset') === 'continue'}
        onChange={v => updateFocusSettings({ intervalResetMode: v ? 'continue' : 'reset' })} />
    </SettingList>
  )}
