import { useState } from 'react'
import { CheckCircle2, CircleDashed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModelSlotCard } from './ModelSlotCard'
import { OptimizeForToggle } from './OptimizeForToggle'
import { ToolSupportWarningBanner } from './ToolSupportWarningBanner'
import { isSlotFilled } from './aiSlotHelpers'

function SetupStep({ titleKey, descKey, t, active, done }) {
  return (
    <div className={`flex gap-3 transition-opacity ${active || done ? 'opacity-100' : 'opacity-35'}`}>
      <div className="mt-0.5 shrink-0">
        {done
          ? <CheckCircle2 className="h-4 w-4 text-primary" />
          : <CircleDashed className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />}
      </div>
      <div className="space-y-1.5 flex-1">
        <p className="text-sm font-medium leading-snug">{t[titleKey]}</p>
        {active && <p className="text-xs text-muted-foreground leading-relaxed">{t[descKey]}</p>}
      </div>
    </div>
  )
}

export function SetupFlow({ t, mediumSlot, providers, isNativeBuild, optimizeFor, onSlotChange, onSlotClear, onOptimizeForChange, onFinish }) {
  const [step, setStep] = useState(0)
  const [toolWarning, setToolWarning] = useState(false)

  const mediumReady = isSlotFilled(mediumSlot)

  const handleToolSupportResult = result => setToolWarning(Boolean(result?.warnMissingToolSupport))

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <SetupStep titleKey="aiSetupStep1Title" descKey="aiSetupStep1Desc" t={t} active={step === 0} done={step > 0} />
        <SetupStep titleKey="aiSetupStep2Title" descKey="aiSetupStep2Desc" t={t} active={step === 1} done={step > 1} />
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <ModelSlotCard t={t} slotName="medium" slot={mediumSlot} providers={providers}
            isNativeBuild={isNativeBuild} onChange={onSlotChange} onClear={onSlotClear}
            onToolSupportWarning={handleToolSupportResult} />
          {toolWarning && <ToolSupportWarningBanner t={t} />}
          <Button className="w-full" disabled={!mediumReady} onClick={() => setStep(1)}>
            {t.aiSetupNext}
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <OptimizeForToggle t={t} value={optimizeFor} onChange={onOptimizeForChange} />
          <Button className="w-full" onClick={onFinish}>{t.aiSetupFinish}</Button>
        </div>
      )}
    </div>
  )
}
