import { ShieldAlert, KeyRound } from 'lucide-react'
import { useStrings } from '@/lib/strings'
import { SecretPrompt } from './SecretPrompt'

export function UnlockGate({ lang = 'en', hint, storeError, onUnlock }) {
  const t = useStrings(lang)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="flex min-h-screen flex-col items-center justify-center px-8 py-16">
        <div className="w-full max-w-xs space-y-6">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight">{t.encUnlockTitle}</h1>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{t.encUnlockDesc}</p>

          {storeError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex gap-2.5">
              <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-destructive">{t.encStoreUnavailableTitle}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{t.encStoreUnavailableDesc}</p>
              </div>
            </div>
          )}

          <SecretPrompt t={t} hint={hint} onUnlock={onUnlock} submitLabel={t.encUnlockTitle} />
        </div>
      </div>
    </div>
  )
}
