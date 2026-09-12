import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { listProviders } from '@/lib/ai/providers'
import { aiAssistantApp } from '@/apps/aiAssistant'
import { SetupFlow } from './ai/SetupFlow'
import { ConfiguredView } from './ai/ConfiguredView'
import { isSlotFilled, withSlotPatch, withSlotCleared } from './ai/aiSlotHelpers'

const DEFAULT_AI_SETTINGS = { optimizeFor: 'requests', slots: {} }

function isNativeBuild() {
  // eslint-disable-next-line no-undef
  return typeof __NATIVE_BUILD__ !== 'undefined' && __NATIVE_BUILD__ === true
}

export function AiAppModal({ open, onOpenChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const apps = useStore(s => s.settings?.apps) ?? {}
  const aiSettings = useStore(s => s.settings?.apps?.ai) ?? DEFAULT_AI_SETTINGS
  const updateSettings = useStore(s => s.updateSettings)
  const wipeAppData = useStore(s => s.wipeAppData)
  const [confirmOff, setConfirmOff] = useState(false)

  const providers = listProviders()
  const enabled = apps.aiAssistant === true
  const slots = aiSettings.slots ?? {}
  const optimizeFor = aiSettings.optimizeFor ?? 'requests'
  const configured = enabled && isSlotFilled(slots.medium)

  const persistAiSettings = nextAiSettings => {
    const currentApps = useStore.getState().settings?.apps ?? {}
    updateSettings({ apps: { ...currentApps, ai: nextAiSettings } })
  }

  const handleSetupSlotChange = patch => {
    persistAiSettings(withSlotPatch(aiSettings, 'medium', patch))
  }

  const handleSetupSlotClear = () => {
    persistAiSettings(withSlotCleared(aiSettings, 'medium'))
  }

  const handleOptimizeForChange = value => {
    persistAiSettings({ ...aiSettings, optimizeFor: value })
  }

  const handleSetupFinish = () => {
    const currentApps = useStore.getState().settings?.apps ?? {}
    updateSettings({ apps: { ...currentApps, aiAssistant: true } })
  }

  const toggle = value => {
    if (!value) { setConfirmOff(true); return }
    const currentApps = useStore.getState().settings?.apps ?? {}
    updateSettings({ apps: { ...currentApps, aiAssistant: true } })
  }

  const handleSlotChange = (slotName, patch) => {
    persistAiSettings(withSlotPatch(aiSettings, slotName, patch))
  }

  const handleSlotClear = slotName => {
    persistAiSettings(withSlotCleared(aiSettings, slotName))
  }

  const handleDisableConfirmed = () => {
    wipeAppData(aiAssistantApp.wipe)
    const currentApps = useStore.getState().settings?.apps ?? {}
    updateSettings({ apps: { ...currentApps, aiAssistant: false, ai: DEFAULT_AI_SETTINGS } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.aiAssistant}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t.aiEnable}</p>
              <p className="text-xs text-muted-foreground">{t.aiEnableDesc}</p>
            </div>
            <Switch checked={enabled} onCheckedChange={toggle} />
          </div>

          {enabled && (configured ? (
            <ConfiguredView t={t} slots={slots} providers={providers} isNativeBuild={isNativeBuild()}
              optimizeFor={optimizeFor} onSlotChange={handleSlotChange} onSlotClear={handleSlotClear}
              onOptimizeForChange={handleOptimizeForChange} />
          ) : (
            <div className="space-y-6 border-t border-border/50 pt-4">
              <p className="text-xs text-muted-foreground leading-relaxed">{t.aiSetupIntro}</p>
              <SetupFlow t={t} mediumSlot={slots.medium} providers={providers} isNativeBuild={isNativeBuild()}
                optimizeFor={optimizeFor} onSlotChange={handleSetupSlotChange} onSlotClear={handleSetupSlotClear}
                onOptimizeForChange={handleOptimizeForChange} onFinish={handleSetupFinish} />
            </div>
          ))}
        </div>

        <ConfirmDialog open={confirmOff} onOpenChange={setConfirmOff}
          title={t.aiDisableTitle} description={t.aiDisableDesc} onConfirm={handleDisableConfirmed} />
      </DialogContent>
    </Dialog>
  )
}
