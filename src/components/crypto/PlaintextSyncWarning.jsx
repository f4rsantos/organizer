import { useState } from 'react'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isPlaintextSyncAcknowledged, acknowledgePlaintextSync } from '@/lib/crypto'

export function PlaintextSyncWarning({ t, onEnable }) {
  const [dismissed, setDismissed] = useState(() => isPlaintextSyncAcknowledged())

  if (dismissed) return null

  const dismiss = () => {
    acknowledgePlaintextSync()
    setDismissed(true)
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-destructive" />
        <span className="text-sm font-medium text-destructive">{t.encPlaintextSyncWarnTitle}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{t.encPlaintextSyncWarnDesc}</p>
      <div className="space-y-2">
        <Button className="w-full gap-2" variant="outline" onClick={onEnable}>
          <ShieldCheck className="h-3.5 w-3.5" />
          {t.encPlaintextSyncEnable}
        </Button>
        <button onClick={dismiss}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
          {t.encPlaintextSyncDismiss}
        </button>
      </div>
    </div>
  )
}
