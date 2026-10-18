import { SettingSelect } from '../SettingRow'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { getNotificationSettings } from '@/lib/notifications/settings'

export function NotificationBellSettings() {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const notifications = getNotificationSettings(settings)

  const options = [
    { value: 'always', label: t.notificationBellAlways },
    { value: 'hideEmpty', label: t.notificationBellHideEmpty },
    { value: 'hideNone', label: t.notificationBellHideNone },
  ]

  return (
    <SettingSelect label={t.notificationBellVisibilityLabel} desc={t.notificationBellVisibilityDesc}
      value={notifications.bellVisibility} options={options}
      onChange={v => updateSettings({ notifications: { ...notifications, bellVisibility: v } })} />
  )}
