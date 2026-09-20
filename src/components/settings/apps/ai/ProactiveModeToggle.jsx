import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { hasAcceptedProactiveConsent, grantProactiveConsent } from './aiConsent'

export function ProactiveModeToggle({ t, enabled, onChange }) {
  const [showConsent, setShowConsent] = useState(false)

  const handleToggle = value => {
    if (!value) {
      onChange(false)
      return
    }
    if (hasAcceptedProactiveConsent()) {
      onChange(true)
      return
    }
    setShowConsent(true)
  }

  const handleAccept = () => {
    grantProactiveConsent()
    setShowConsent(false)
    onChange(true)
  }

  return (
    <div className="space-y-2 border-t border-border/50 pt-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{t.aiProactiveLabel}</p>
          <p className="text-xs text-muted-foreground">{t.aiProactiveDesc}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} />
      </div>

      {showConsent && (
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/40 p-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{t.aiProactiveConsentNotice}</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={handleAccept}>
            {t.aiConsentAccept}
          </Button>
        </div>
      )}
    </div>
  )
}
