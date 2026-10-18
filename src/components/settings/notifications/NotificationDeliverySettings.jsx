import { SettingSelect, SettingToggle } from '../SettingRow'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { getNotificationSettings } from '@/lib/notifications/settings'
import { requestNotificationPermission } from '@/lib/notifications/permission'

export function NotificationDeliverySettings() {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const notifications = getNotificationSettings(settings)

  const intrusivenessOptions = [
    { value: 'toast', label: t.notificationIntrusivenessToast },
    { value: 'alert', label: t.notificationIntrusivenessAlert },
  ]

  const patch = data => updateSettings({ notifications: { ...notifications, ...data } })

  const handleBrowserPushChange = value => {
    patch({ browserPush: value })
    if (value) requestNotificationPermission()
  }

  return (
    <>
      <SettingSelect label={t.notificationIntrusivenessLabel} desc={t.notificationIntrusivenessDesc}
        value={notifications.intrusiveness} options={intrusivenessOptions} onChange={v => patch({ intrusiveness: v })} />
      <SettingToggle label={t.notificationVibrateLabel} checked={notifications.vibrate} onChange={v => patch({ vibrate: v })} />
      <SettingToggle label={t.notificationSoundLabel} checked={notifications.sound} onChange={v => patch({ sound: v })} />
      <SettingToggle label={t.notificationBrowserPushLabel} checked={notifications.browserPush} onChange={handleBrowserPushChange} />
    </>
  )}
