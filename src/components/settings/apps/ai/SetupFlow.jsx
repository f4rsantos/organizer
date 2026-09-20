import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ModelSlotCard } from './ModelSlotCard'
import { ToolSupportWarningBanner } from './ToolSupportWarningBanner'
import { isSlotFilled } from './aiSlotHelpers'

export function SetupFlow({ t, mediumSlot, providers, isNativeBuild, onSlotChange, onSlotClear }) {
  const [toolWarning, setToolWarning] = useState(false)
  const [draft, setDraft] = useState(mediumSlot ?? null)

  const handleToolSupportResult = result => setToolWarning(Boolean(result?.warnMissingToolSupport))

  const handleDraftChange = patch => setDraft(prev => ({ ...(prev ?? {}), ...patch }))

  const handleClear = () => {
    setDraft(null)
    onSlotClear()
  }

  const handleSave = () => onSlotChange(draft)

  const canSave = isSlotFilled(draft) && JSON.stringify(draft) !== JSON.stringify(mediumSlot ?? null)

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{t.aiSetupStep1Title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{t.aiSetupStep1Desc}</p>
      <ModelSlotCard t={t} slotName="medium" slot={draft} providers={providers}
        isNativeBuild={isNativeBuild} onChange={handleDraftChange} onClear={handleClear}
        onToolSupportWarning={handleToolSupportResult} />
      {toolWarning && <ToolSupportWarningBanner t={t} />}
      <Button type="button" size="sm" onClick={handleSave} disabled={!canSave}>
        {t.aiSetupSave}
      </Button>
    </div>
  )
}
