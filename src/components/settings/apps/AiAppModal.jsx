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

  const handleAutoModeChange = value => {
    persistAiSettings({ ...aiSettings, autoMode: Boolean(value) })
  }

  const handleDefaultSlotChange = value => {
    persistAiSettings({ ...aiSettings, selectedSlot: value })
  }

  const handleShortcutChange = value => {
    const currentApps = useStore.getState().settings?.apps ?? {}
    updateSettings({ apps: { ...currentApps, aiAssistantShortcut: value } })
  }

  const handleCustomInstructionsChange = value => {
    persistAiSettings({ ...aiSettings, customInstructions: value })
  }

  const shortcut = apps.aiAssistantShortcut ?? null
  const defaultSlot = aiSettings.selectedSlot ?? 'medium'

  const handleDisableConfirmed = () => {
    wipeAppData(aiAssistantApp.wipe)
    const currentApps = useStore.getState().settings?.apps ?? {}
    updateSettings({ apps: { ...currentApps, aiAssistant: false, ai: DEFAULT_AI_SETTINGS } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t.aiAssistant}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[85vh] overflow-y-auto overflow-x-hidden space-y-4">
          {!configured && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t.aiEnable}</p>
                <p className="text-xs text-muted-foreground">{t.aiEnableDesc}</p>
              </div>
              <Switch checked={enabled} onCheckedChange={toggle} />
            </div>
          )}

          {enabled && (configured ? (
            <ConfiguredView t={t} slots={slots} providers={providers} isNativeBuild={isNativeBuild()}
              enabled={enabled} onToggle={toggle}
              onSlotChange={handleSlotChange} onSlotClear={handleSlotClear}
              autoMode={aiSettings.autoMode === true} onAutoModeChange={handleAutoModeChange}
              defaultSlot={defaultSlot} onDefaultSlotChange={handleDefaultSlotChange}
              shortcut={shortcut} onShortcutChange={handleShortcutChange}
              customInstructions={aiSettings.customInstructions ?? ''}
              onCustomInstructionsChange={handleCustomInstructionsChange} />
          ) : (
            <div className="space-y-6 border-t border-border/50 pt-4">
              <p className="text-xs text-muted-foreground leading-relaxed">{t.aiSetupIntro}</p>
              <SetupFlow t={t} mediumSlot={slots.medium} providers={providers} isNativeBuild={isNativeBuild()}
                onSlotChange={handleSetupSlotChange} onSlotClear={handleSetupSlotClear} />
            </div>
          ))}
        </div>

        <ConfirmDialog open={confirmOff} onOpenChange={setConfirmOff}
          title={t.aiDisableTitle} description={t.aiDisableDesc} onConfirm={handleDisableConfirmed} />
      </DialogContent>
    </Dialog>
  )
}
