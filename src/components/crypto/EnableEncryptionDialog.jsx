import { useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PassphraseField, HintField } from './PassphraseField'
import { RecoveryCodeDisplay } from './RecoveryCodeDisplay'

const MIN_PASSPHRASE_LENGTH = 8

export function EnableEncryptionDialog({ t, onEnable, onDone, onCancel, busyLabel }) {
  const [passphrase, setPassphrase] = useState('')
  const [confirmValue, setConfirmValue] = useState('')
  const [hint, setHint] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState(null)

  const submit = async () => {
    if (passphrase.length < MIN_PASSPHRASE_LENGTH) { setError(t.encPassphraseTooShort); return }
    if (passphrase !== confirmValue) { setError(t.encPassphraseMismatch); return }

    setBusy(true)
    setError(null)
    try {
      const result = await onEnable({ passphrase, hint: hint.trim() })
      setRecoveryCode(result.recoveryCode)
    } catch {
      setError(t.encEnableFailed)
    } finally {
      setBusy(false)
    }
  }

  if (recoveryCode) {
    return <RecoveryCodeDisplay t={t} recoveryCode={recoveryCode} onAcknowledge={onDone} />
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{t.encEnableTitle}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{t.encEnableDesc}</p>

      <PassphraseField label={t.encPassphraseLabel} value={passphrase}
        onChange={v => { setPassphrase(v); setError(null) }} placeholder={t.encPassphrasePlaceholder} />
      <PassphraseField label={t.encPassphraseConfirmLabel} value={confirmValue}
        onChange={v => { setConfirmValue(v); setError(null) }} placeholder={t.encPassphrasePlaceholder}
        onEnter={submit} />
      <HintField label={t.encHintLabel} value={hint}
        onChange={setHint} placeholder={t.encHintPlaceholder} />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        {onCancel && (
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={busy}>
            {t.cancel}
          </Button>
        )}
        <Button className="flex-1" onClick={submit} disabled={busy || !passphrase || !confirmValue}>
          {busy
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />{busyLabel ?? t.encDeriving}</>
            : t.encEnableSubmit}
        </Button>
      </div>
    </div>
  )
}
