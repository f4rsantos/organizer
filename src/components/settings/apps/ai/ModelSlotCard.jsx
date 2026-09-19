import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TestModelButton } from './TestModelButton'
import { ConsentNotice } from './ConsentNotice'
import { OptimizeForToggle } from './OptimizeForToggle'
import { hasConsentedTo, grantConsent } from './aiConsent'
import { localhostHintKey } from './aiSlotHelpers'
import { loadAiKey, saveAiKey, loadBaseUrl, saveBaseUrl } from '@/lib/ai/keys'

const SLOT_LABEL_KEYS = { low: 'aiSlotLowLabel', medium: 'aiSlotMediumLabel', high: 'aiSlotHighLabel' }
const SLOT_DESC_KEYS = { low: 'aiSlotLowDesc', medium: 'aiSlotMediumDesc', high: 'aiSlotHighDesc' }

export function ModelSlotCard({
  t, slotName, slot, providers, isNativeBuild, onChange, onClear, onToolSupportWarning,
}) {
  const provider = slot?.provider ?? ''
  const model = slot?.model ?? ''
  const dailyCap = slot?.dailyCap ?? ''
  const optimizeFor = slot?.optimizeFor ?? 'requests'
  const [baseUrl, setBaseUrlState] = useState(() => loadBaseUrl(provider))
  const [apiKey, setApiKeyState] = useState(() => loadAiKey(provider))
  const [consented, setConsented] = useState(() => hasConsentedTo(provider, baseUrl))

  const adapter = providers.find(p => p.id === provider) ?? null
  const requiresBaseUrl = adapter?.requiresBaseUrl === true
  const hintKey = requiresBaseUrl ? localhostHintKey(baseUrl, isNativeBuild) : null

  const handleProviderChange = value => {
    const nextBaseUrl = loadBaseUrl(value)
    const nextApiKey = loadAiKey(value)
    setBaseUrlState(nextBaseUrl)
    setApiKeyState(nextApiKey)
    setConsented(hasConsentedTo(value, nextBaseUrl))
    onChange({ provider: value, model: '' })
  }

  const handleModelChange = value => onChange({ model: value })

  const handleBaseUrlChange = value => {
    setBaseUrlState(value)
    saveBaseUrl(provider, value)
    setConsented(hasConsentedTo(provider, value))
  }

  const handleApiKeyChange = value => {
    setApiKeyState(value)
    saveAiKey(provider, value)
  }

  const handleAcceptConsent = () => {
    grantConsent(provider, baseUrl)
    setConsented(true)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{t[SLOT_LABEL_KEYS[slotName]]}</p>
          <p className="text-xs text-muted-foreground">{t[SLOT_DESC_KEYS[slotName]]}</p>
        </div>
        {slot && (
          <button type="button" onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t.aiSlotClear}
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>{t.aiSlotProvider}</Label>
        <Select value={provider || undefined} onValueChange={handleProviderChange}>
          <SelectTrigger className="w-full"><SelectValue placeholder={t.aiSlotProviderPlaceholder} /></SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {providers.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {provider && (
        <>
          {requiresBaseUrl && (
            <div className="space-y-1.5">
              <Label>{t.aiSlotBaseUrl}</Label>
              <Input value={baseUrl} onChange={e => handleBaseUrlChange(e.target.value)}
                placeholder={t.aiSlotBaseUrlPlaceholder} className="font-mono text-xs" />
              {hintKey && <p className="text-xs text-muted-foreground leading-relaxed">{t[hintKey]}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{t.aiSlotModel}</Label>
            <Input value={model} onChange={e => handleModelChange(e.target.value)}
              placeholder={t.aiSlotModelPlaceholder} className="font-mono text-xs" />
          </div>

          <div className="space-y-1.5">
            <Label>{t.aiSlotApiKey}</Label>
            <Input type="password" value={apiKey} onChange={e => handleApiKeyChange(e.target.value)}
              placeholder={t.aiSlotApiKeyPlaceholder} className="font-mono text-xs" />
          </div>

          <div className="space-y-1.5">
            <Label>{t.aiSlotDailyCap}</Label>
            <Input type="number" min="0" value={dailyCap}
              onChange={e => onChange({ dailyCap: e.target.value === '' ? undefined : Number(e.target.value) })}
              placeholder={t.aiSlotDailyCapPlaceholder} className="text-xs" />
          </div>

          <div className="space-y-1.5">
            <Label>{t.aiOptimizeForLabel}</Label>
            <OptimizeForToggle t={t} value={optimizeFor} onChange={value => onChange({ optimizeFor: value })} />
          </div>

          {model.trim() && (
            consented ? (
              <TestModelButton t={t} slotName={slotName} provider={provider} baseUrl={baseUrl}
                apiKey={apiKey} model={model} onResult={onToolSupportWarning} />
            ) : (
              <ConsentNotice t={t} provider={provider} providerLabel={adapter?.label}
                baseUrl={baseUrl} onAccept={handleAcceptConsent} />
            )
          )}
        </>
      )}
    </div>
  )
}
