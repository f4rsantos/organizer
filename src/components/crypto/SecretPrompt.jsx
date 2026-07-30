import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PassphraseField, RecoveryCodeField } from './PassphraseField'
import { useSecretUnlock } from './useSecretUnlock'

export function SecretPrompt({ t, hint, onUnlock, submitLabel, autoFocus = true }) {
  const unlock = useSecretUnlock({ onUnlock, t })

  return (
    <div className="space-y-3">
      {hint && !unlock.usingRecoveryCode && (
        <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">{t.encUnlockHintLabel}</p>
          <p className="text-sm">{hint}</p>
        </div>
      )}

      {unlock.usingRecoveryCode ? (
        <RecoveryCodeField
          label={t.encRecoveryCodeLabel}
          value={unlock.value}
          onChange={unlock.update}
          placeholder={t.encRecoveryCodePlaceholder}
        />
      ) : (
        <PassphraseField
          label={t.encPassphraseLabel}
          value={unlock.value}
          onChange={unlock.update}
          placeholder={t.encPassphrasePlaceholder}
          autoFocus={autoFocus}
          onEnter={unlock.submit}
        />
      )}

      {unlock.error && <p className="text-xs text-destructive">{unlock.error}</p>}

      <Button className="w-full" onClick={unlock.submit} disabled={!unlock.value.trim() || unlock.busy}>
        {unlock.busy
          ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />{t.encDeriving}</>
          : (submitLabel ?? t.confirm)}
      </Button>

      <button onClick={unlock.switchSlot}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
        {unlock.usingRecoveryCode ? t.encUsePassphrase : t.encUseRecoveryCode}
      </button>
    </div>
  )
}
