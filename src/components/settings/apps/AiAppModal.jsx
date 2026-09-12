import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { listProviders } from '@/lib/ai/providers'
import { clearAllAiKeys } from '@/lib/ai/keys'
import { aiAssistantApp } from '@/apps/aiAssistant'
import { SetupFlow } from './ai/SetupFlow'
import { ConfiguredView } from './ai/ConfiguredView'
import { isSlotFilled, withSlotPatch, withSlotCleared } from './ai/aiSlotHelpers'
import { clearAllConsent } from './ai/aiConsent'

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
    updateSettings({ apps: { ...apps, ai: nextAiSettings } })
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
    updateSettings({ apps: { ...apps, aiAssistant: true, ai: aiSettings } })
  }

  const handleSlotChange = (slotName, patch) => {
    persistAiSettings(withSlotPatch(aiSettings, slotName, patch))
  }

  const handleSlotClear = slotName => {
    persistAiSettings(withSlotCleared(aiSettings, slotName))
  }

  const handleDisableConfirmed = () => {
    wipeAppData(aiAssistantApp.wipe)
    clearAllAiKeys()
    clearAllConsent()
    updateSettings({ apps: { ...apps, aiAssistant: false, ai: DEFAULT_AI_SETTINGS } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.aiAssistant}</DialogTitle>
        </DialogHeader>

        {configured ? (
          <ConfiguredView t={t} slots={slots} providers={providers} isNativeBuild={isNativeBuild()}
            optimizeFor={optimizeFor} onSlotChange={handleSlotChange} onSlotClear={handleSlotClear}
            onOptimizeForChange={handleOptimizeForChange} onRequestDisable={() => setConfirmOff(true)} />
        ) : (
          <div className="space-y-6">
            <p className="text-xs text-muted-foreground leading-relaxed">{t.aiSetupIntro}</p>
            <SetupFlow t={t} mediumSlot={slots.medium} providers={providers} isNativeBuild={isNativeBuild()}
              optimizeFor={optimizeFor} onSlotChange={handleSetupSlotChange} onSlotClear={handleSetupSlotClear}
              onOptimizeForChange={handleOptimizeForChange} onFinish={handleSetupFinish} />
          </div>
        )}

        {enabled && !configured && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm">{t.aiEnable}</p>
            <Switch checked={false} onCheckedChange={() => setConfirmOff(true)} />
          </div>
        )}

        <ConfirmDialog open={confirmOff} onOpenChange={setConfirmOff}
          title={t.aiDisableTitle} description={t.aiDisableDesc} onConfirm={handleDisableConfirmed} />
      </DialogContent>
    </Dialog>
  )
}
