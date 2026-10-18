import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { liveActivitiesAvailable } from '@/lib/widgets/bridge'

const KIND_LABEL_KEYS = {
  focus: 'liveActivityFocus',
  upNext: 'liveUpNext',
  deadline: 'liveActivityDeadline',
  agent: 'liveActivityAgent',
}

export function LiveActivitySettings() {
  const updateSettings = useStore(s => s.updateSettings)
  const liveActivities = useStore(s => s.settings?.liveActivities)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  if (!liveActivitiesAvailable()) return null

  const toggle = (kind, on) => updateSettings({ liveActivities: { ...(liveActivities ?? {}), [kind]: on } })

  return (
    <div className="space-y-2 pt-2">
      <div className="space-y-0.5">
        <Label>{t.liveActivitiesTitle}</Label>
        <p className="text-xs text-muted-foreground">{t.liveActivitiesHint}</p>
      </div>
      {Object.entries(KIND_LABEL_KEYS).map(([kind, key]) => (
        <div key={kind} className="flex items-center justify-between gap-3">
          <span className="text-sm">{t[key]}</span>
          <Switch checked={liveActivities?.[kind] !== false} onCheckedChange={on => toggle(kind, on)} />
        </div>
      ))}
    </div>
  )
}
