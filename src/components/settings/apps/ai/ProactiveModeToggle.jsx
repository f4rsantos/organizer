import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { hasAcceptedProactiveConsent, grantProactiveConsent } from './aiConsent'
import { SettingToggle } from '../../SettingRow'

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
      <SettingToggle label={t.aiProactiveLabel} desc={t.aiProactiveDesc} checked={enabled} onChange={handleToggle} />

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
