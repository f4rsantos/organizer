import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    <div className="space-y-1.5">
      <Label>{t.notificationBellVisibilityLabel}</Label>
      <p className="text-xs text-muted-foreground">{t.notificationBellVisibilityDesc}</p>
      <Select
        value={notifications.bellVisibility}
        onValueChange={v => updateSettings({ notifications: { ...notifications, bellVisibility: v } })}
        items={options}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4}>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
