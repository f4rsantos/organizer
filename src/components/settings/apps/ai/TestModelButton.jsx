import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { testModel } from '@/lib/ai/aiClient'
import { errorKindStringKey, shouldWarnMissingToolSupport } from './aiSlotHelpers'

export function TestModelButton({ t, slotName, provider, baseUrl, apiKey, model, onResult }) {
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)

  const disabled = !provider || !model?.trim() || status === 'running'

  const handleTest = async () => {
    setStatus('running')
    setResult(null)
    const outcome = await testModel({ provider, baseUrl, apiKey, model })
    setStatus(outcome.ok ? 'ok' : 'error')
    setResult(outcome)
    onResult?.({
      ok: outcome.ok,
      toolSupport: outcome.toolSupport,
      warnMissingToolSupport: outcome.ok && !outcome.toolSupport && shouldWarnMissingToolSupport(slotName),
    })
  }

  return (
    <div className="space-y-1.5">
      <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={disabled}>
        {status === 'running'
          ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />{t.aiTesting}</>
          : t.aiTestModel}
      </Button>
      {status === 'ok' && result && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
          {result.toolSupport ? t.aiTestOkWithTools : t.aiTestOkNoTools}
        </p>
      )}
      {status === 'error' && result && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          {t[errorKindStringKey(result.error?.kind)]}
        </p>
      )}
    </div>
  )
}
