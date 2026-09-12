import { useState } from 'react'
import { ModelSlotCard } from './ModelSlotCard'
import { OptimizeForToggle } from './OptimizeForToggle'
import { BudgetMeter } from './BudgetMeter'
import { ToolSupportWarningBanner } from './ToolSupportWarningBanner'
import { SLOT_ORDER } from './aiSlotHelpers'

export function ConfiguredView({ t, slots, providers, isNativeBuild, optimizeFor, onSlotChange, onSlotClear, onOptimizeForChange }) {
  const [toolWarnings, setToolWarnings] = useState({})

  const handleToolSupportResult = slotName => result => {
    setToolWarnings(prev => ({ ...prev, [slotName]: Boolean(result?.warnMissingToolSupport) }))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-sm font-medium">{t.aiConfigured}</span>
        </div>
        <BudgetMeter t={t} optimizeFor={optimizeFor} slots={slots} />
      </div>

      <div className="space-y-4 border-t border-border/50 pt-4">
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{t.aiOptimizeForLabel}</p>
          <OptimizeForToggle t={t} value={optimizeFor} onChange={onOptimizeForChange} />
        </div>
      </div>

      <div className="space-y-4 border-t border-border/50 pt-4">
        <p className="text-sm font-medium">{t.aiModelSlots}</p>
        {SLOT_ORDER.map(slotName => (
          <div key={slotName} className="space-y-2">
            <ModelSlotCard t={t} slotName={slotName} slot={slots[slotName]} providers={providers}
              isNativeBuild={isNativeBuild} onChange={patch => onSlotChange(slotName, patch)}
              onClear={() => onSlotClear(slotName)}
              onToolSupportWarning={handleToolSupportResult(slotName)} />
            {toolWarnings[slotName] && <ToolSupportWarningBanner t={t} />}
          </div>
        ))}
      </div>
    </div>
  )
}
