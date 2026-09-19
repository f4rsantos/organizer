import { Circle, CircleCheck } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { getNotificationSettings } from '@/lib/notifications/settings'
import { requestNotificationPermission } from '@/lib/notifications/permission'

function ToggleRow({ label, value, onToggle, t }) {
  return (
    <button type="button" onClick={onToggle}
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
      {value ? <CircleCheck className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4" />}
      {label} · {value ? t.settingEnabled : t.settingDisabled}
    </button>
  )
}

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
    <div className="space-y-3 rounded-xl border border-border bg-card/50 p-3">
      <div className="space-y-1.5">
        <Label>{t.notificationIntrusivenessLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.notificationIntrusivenessDesc}</p>
        <Select value={notifications.intrusiveness} onValueChange={v => patch({ intrusiveness: v })} items={intrusivenessOptions}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {intrusivenessOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <ToggleRow label={t.notificationVibrateLabel} value={notifications.vibrate} onToggle={() => patch({ vibrate: !notifications.vibrate })} t={t} />
        <ToggleRow label={t.notificationSoundLabel} value={notifications.sound} onToggle={() => patch({ sound: !notifications.sound })} t={t} />
        <ToggleRow label={t.notificationBrowserPushLabel} value={notifications.browserPush} onToggle={() => handleBrowserPushChange(!notifications.browserPush)} t={t} />
      </div>
    </div>
  )
}
