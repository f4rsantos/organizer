import { Circle, CircleCheck, TriangleAlert } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { isEncryptionEnabled } from '@/lib/crypto'
import { useWidgetsAvailable } from '@/hooks/useWidgetsAvailable'

export function WidgetSettings() {
  const updateSettings = useStore(s => s.updateSettings)
  const widgetsEnabled = useStore(s => s.settings?.widgetsEnabled === true)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const available = useWidgetsAvailable()

  if (!available) return null

  const encrypted = isEncryptionEnabled()

  return (
    <div className="space-y-1.5">
      <Label>{t.widgetsLabel}</Label>
      <p className="text-xs text-muted-foreground">{t.widgetsDesc}</p>
      {encrypted && (
        <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5">
          <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-900 dark:text-amber-200">{t.widgetsEncryptionWarning}</p>
        </div>
      )}
      <button type="button" onClick={() => updateSettings({ widgetsEnabled: !widgetsEnabled })}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        {widgetsEnabled
          ? <CircleCheck className="h-4 w-4 text-primary" />
          : <Circle className="h-4 w-4" />}
        {widgetsEnabled ? t.settingEnabled : t.settingDisabled}
      </button>
    </div>
  )
}
