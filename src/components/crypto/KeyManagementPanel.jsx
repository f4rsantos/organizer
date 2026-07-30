import { useState } from 'react'
import { Loader2, ShieldCheck, KeyRound, RefreshCw, Pencil, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PassphraseField, HintField } from './PassphraseField'
import { RecoveryCodeDisplay } from './RecoveryCodeDisplay'
import { SLOT_PASSPHRASE } from '@/lib/crypto'

const MIN_PASSPHRASE_LENGTH = 8
const VIEW_NONE = 'none'
const VIEW_PASSPHRASE = 'passphrase'
const VIEW_RECOVERY = 'recovery'
const VIEW_HINT = 'hint'
const VIEW_ROTATE = 'rotate'

function ActionRow({ icon, label, onClick }) {
  const Glyph = icon
  return (
    <button onClick={onClick}
      className="flex w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
      <Glyph className="h-3.5 w-3.5" /> {label}
    </button>
  )
}

export function KeyManagementPanel({
  t, hint, onChangePassphrase, onRegenerateRecoveryCode, onSaveHint, onRotateKey,
}) {
  const [view, setView] = useState(VIEW_NONE)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmValue, setConfirmValue] = useState('')
  const [hintValue, setHintValue] = useState(hint ?? '')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState(null)
  const [saved, setSaved] = useState(false)

  const reset = () => {
    setView(VIEW_NONE)
    setCurrent('')
    setNext('')
    setConfirmValue('')
    setError(null)
    setRecoveryCode(null)
  }

  const run = async action => {
    setBusy(true)
    setError(null)
    try {
      return await action()
    } catch (err) {
      setError(err?.message === 'wrap-unlock-failed' ? t.encUnlockFailed : t.encEnableFailed)
      return null
    } finally {
      setBusy(false)
    }
  }

  const submitPassphrase = async () => {
    if (next.length < MIN_PASSPHRASE_LENGTH) { setError(t.encPassphraseTooShort); return }
    if (next !== confirmValue) { setError(t.encPassphraseMismatch); return }
    const ok = await run(() => onChangePassphrase({
      currentSlot: SLOT_PASSPHRASE, currentSecret: current, passphrase: next,
    }))
    if (ok) reset()
  }

  const submitRecovery = async () => {
    const result = await run(() => onRegenerateRecoveryCode({
      currentSlot: SLOT_PASSPHRASE, currentSecret: current,
    }))
    if (result?.recoveryCode) setRecoveryCode(result.recoveryCode)
  }

  const submitRotate = async () => {
    if (next.length < MIN_PASSPHRASE_LENGTH) { setError(t.encPassphraseTooShort); return }
    if (next !== confirmValue) { setError(t.encPassphraseMismatch); return }
    const result = await run(() => onRotateKey({
      currentSlot: SLOT_PASSPHRASE, currentSecret: current, passphrase: next,
    }))
    if (result?.recoveryCode) setRecoveryCode(result.recoveryCode)
  }

  const submitHint = async () => {
    const ok = await run(() => onSaveHint(hintValue.trim()))
    if (ok !== null) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      setView(VIEW_NONE)
    }
  }

  if (recoveryCode) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <RecoveryCodeDisplay t={t} recoveryCode={recoveryCode} onAcknowledge={reset} />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{t.encManageTitle}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{t.encManageDesc}</p>

      {view === VIEW_NONE && (
        <div className="space-y-2">
          <ActionRow icon={KeyRound} label={t.encChangePassphrase} onClick={() => setView(VIEW_PASSPHRASE)} />
          <ActionRow icon={RefreshCw} label={t.encRegenerateRecoveryCode} onClick={() => setView(VIEW_RECOVERY)} />
          <ActionRow icon={Pencil} label={t.encEditHint} onClick={() => setView(VIEW_HINT)} />
          {onRotateKey && (
            <ActionRow icon={RotateCcw} label={t.encRotateDekTitle} onClick={() => setView(VIEW_ROTATE)} />
          )}
          {saved && <p className="text-xs text-primary">{t.encSaved}</p>}
        </div>
      )}

      {view === VIEW_PASSPHRASE && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">{t.encChangePassphraseDesc}</p>
          <PassphraseField label={t.encCurrentPassphraseLabel} value={current}
            onChange={v => { setCurrent(v); setError(null) }} autoFocus />
          <PassphraseField label={t.encPassphraseLabel} value={next}
            onChange={v => { setNext(v); setError(null) }} />
          <PassphraseField label={t.encPassphraseConfirmLabel} value={confirmValue}
            onChange={v => { setConfirmValue(v); setError(null) }} onEnter={submitPassphrase} />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={reset} disabled={busy}>{t.cancel}</Button>
            <Button className="flex-1" onClick={submitPassphrase} disabled={busy || !current || !next}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.confirm}
            </Button>
          </div>
        </div>
      )}

      {view === VIEW_RECOVERY && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">{t.encRegenerateRecoveryCodeDesc}</p>
          <PassphraseField label={t.encCurrentPassphraseLabel} value={current}
            onChange={v => { setCurrent(v); setError(null) }} autoFocus onEnter={submitRecovery} />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={reset} disabled={busy}>{t.cancel}</Button>
            <Button className="flex-1" onClick={submitRecovery} disabled={busy || !current}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.confirm}
            </Button>
          </div>
        </div>
      )}

      {view === VIEW_ROTATE && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">{t.encRotateDekDesc}</p>
          <p className="text-xs text-destructive leading-relaxed">{t.encRotateDekWarning}</p>
          <PassphraseField label={t.encCurrentPassphraseLabel} value={current}
            onChange={v => { setCurrent(v); setError(null) }} autoFocus />
          <PassphraseField label={t.encPassphraseLabel} value={next}
            onChange={v => { setNext(v); setError(null) }} />
          <PassphraseField label={t.encPassphraseConfirmLabel} value={confirmValue}
            onChange={v => { setConfirmValue(v); setError(null) }} onEnter={submitRotate} />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={reset} disabled={busy}>{t.cancel}</Button>
            <Button className="flex-1" onClick={submitRotate} disabled={busy || !current || !next}>
              {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />{t.encRotating}</> : t.confirm}
            </Button>
          </div>
        </div>
      )}

      {view === VIEW_HINT && (
        <div className="space-y-2">
          <HintField label={t.encHintLabel} value={hintValue}
            onChange={setHintValue} placeholder={t.encHintPlaceholder} />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={reset} disabled={busy}>{t.cancel}</Button>
            <Button className="flex-1" onClick={submitHint} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.confirm}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
