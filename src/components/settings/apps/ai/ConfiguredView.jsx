import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { ModelSlotCard } from './ModelSlotCard'
import { BudgetMeter } from './BudgetMeter'
import { ToolSupportWarningBanner } from './ToolSupportWarningBanner'
import { AiGeneralSettings } from './AiGeneralSettings'
import { SLOT_ORDER, isSlotFilled } from './aiSlotHelpers'

export function ConfiguredView({
  t, slots, providers, isNativeBuild, enabled, onToggle,
  onSlotChange, onSlotClear,
  autoMode, onAutoModeChange, defaultSlot, onDefaultSlotChange, shortcut, onShortcutChange,
}) {
  const [toolWarnings, setToolWarnings] = useState({})
  const connected = isSlotFilled(slots.medium)

  const handleToolSupportResult = slotName => result => {
    setToolWarnings(prev => ({ ...prev, [slotName]: Boolean(result?.warnMissingToolSupport) }))
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 min-w-0">
      <div className="md:w-[280px] shrink-0 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{t.aiEnable}</p>
              <p className="text-xs text-muted-foreground">{t.aiEnableDesc}</p>
            </div>
            <Switch checked={enabled} onCheckedChange={onToggle} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={connected ? 'h-2 w-2 rounded-full bg-primary' : 'h-2 w-2 rounded-full bg-muted-foreground/40'} />
            <span className="font-medium">{connected ? t.aiConfigured : t.aiNotConnected}</span>
          </div>
          <BudgetMeter t={t} slots={slots} />
        </div>

        <AiGeneralSettings
          t={t}
          slots={slots}
          autoMode={autoMode}
          onAutoModeChange={onAutoModeChange}
          defaultSlot={defaultSlot}
          onDefaultSlotChange={onDefaultSlotChange}
          shortcut={shortcut}
          onShortcutChange={onShortcutChange}
        />
      </div>

      <div className="hidden md:block w-px bg-border self-stretch" />

      <div className="flex-1 min-w-0 space-y-4 border-t border-border/50 pt-4 md:border-t-0 md:pt-0">
        <p className="text-sm font-medium">{t.aiModelSlots}</p>
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-3 min-w-0">
          {SLOT_ORDER.map(slotName => (
            <div key={slotName} className="space-y-2 min-w-0">
              <ModelSlotCard t={t} slotName={slotName} slot={slots[slotName]} providers={providers}
                isNativeBuild={isNativeBuild} onChange={patch => onSlotChange(slotName, patch)}
                onClear={() => onSlotClear(slotName)}
                onToolSupportWarning={handleToolSupportResult(slotName)} />
              {toolWarnings[slotName] && <ToolSupportWarningBanner t={t} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
