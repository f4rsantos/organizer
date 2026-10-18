import { TriangleAlert } from 'lucide-react'
import { SettingToggle } from './SettingRow'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { isEncryptionEnabled } from '@/lib/crypto'
import { useWidgetsAvailable } from '@/hooks/useWidgetsAvailable'
import { LiveActivitySettings } from './LiveActivitySettings'

export function WidgetSettings() {
  const updateSettings = useStore(s => s.updateSettings)
  const widgetsEnabled = useStore(s => s.settings?.widgetsEnabled === true)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const available = useWidgetsAvailable()

  if (!available) return null

  const encrypted = isEncryptionEnabled()

  return (
    <SettingToggle label={t.widgetsLabel} desc={t.widgetsDesc} checked={widgetsEnabled}
      onChange={v => updateSettings({ widgetsEnabled: v })}>
      {encrypted && (
        <p className="flex gap-2 text-xs text-amber-700 dark:text-amber-300">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {t.widgetsEncryptionWarning}
        </p>
      )}
      {widgetsEnabled && <LiveActivitySettings />}
    </SettingToggle>
  )}
