import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isLocalBaseUrl } from './aiConsent'

export function ConsentNotice({ t, provider, providerLabel, baseUrl, onAccept }) {
  const local = isLocalBaseUrl(baseUrl)

  if (local) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 p-3">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">{t.aiConsentLocalNotice}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/40 p-3">
      <div className="flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          {(t.aiConsentThirdPartyNotice ?? '').replace('{provider}', providerLabel ?? provider)}
        </p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onAccept}>
        {t.aiConsentAccept}
      </Button>
    </div>
  )
}
