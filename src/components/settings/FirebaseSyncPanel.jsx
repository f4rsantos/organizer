import { useEffect, useState } from 'react'
import { CheckCircle2, CircleDashed, CloudOff, Cloud, Loader2, X, ShieldAlert, ShieldCheck, KeyRound, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import {
  loadFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig, validateFirebaseConfig,
  loadCollabRulesTag, pushEncryptedToFirebase, pullFromFirebase,
} from '@/lib/firebase'
import { forceSaveState } from '@/store/persist'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import {
  loadKeyString, saveKeyString, generateRawKeyString,
  validateKeyString, isEncryptionEnabled,
} from '@/lib/crypto'

const STEPS = ['firebaseStep1', 'firebaseStep2', 'firebaseStep3', 'firebaseStep4']

const RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /organizer/state {
      allow read, write: if request.auth != null;
    }

    match /teams/{teamId} {
      allow get: if request.auth != null;
      allow list: if false;

      allow create: if request.auth != null
        && request.resource.data.hostUserId == request.auth.uid;

      allow update: if request.auth != null && (
        (resource.data.members[request.auth.uid] != null)
        || (
          resource.data.members[request.auth.uid] == null
          && request.resource.data.diff(resource.data).affectedKeys()
              .hasOnly(['members', 'updatedAt', 'serverUpdatedAt'])
          && request.resource.data.members[request.auth.uid] != null
        )
      );

      allow delete: if request.auth != null
        && resource.data.hostUserId == request.auth.uid;
    }
  }
}`

function SetupStep({ titleKey, t, active, done, onClick }) {
  return (
    <div className={`flex gap-3 transition-opacity cursor-default ${active || done ? 'opacity-100' : 'opacity-35'} ${done ? 'cursor-pointer' : ''}`}
      onClick={onClick}>
      <div className="mt-0.5 shrink-0">
        {done
          ? <CheckCircle2 className="h-4 w-4 text-primary" />
          : <CircleDashed className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
        }
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium leading-snug">{t[titleKey + 'Title']}</p>
        {active && (
          <p className="text-xs text-muted-foreground leading-relaxed">{t[titleKey + 'Desc']}</p>
        )}
      </div>
    </div>
  )
}

function UnauthenticatedWarning({ t }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex gap-2.5">
      <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-destructive">{t.firebaseOpenRulesWarningTitle}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{t.firebaseOpenRulesWarningDesc}</p>
        <div className="rounded-lg border border-border bg-secondary/40 p-3">
          <p className="text-xs font-medium mb-2">{t.firebaseRulesTemplateLink}</p>
          <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">{RULES_SNIPPET}</pre>
        </div>
      </div>
    </div>
  )
}

function EncryptionSection({ config, t }) {
  const [enabled, setEnabled] = useState(() => isEncryptionEnabled())
  const [showKey, setShowKey] = useState(false)
  const [confirmShow, setConfirmShow] = useState(false)
  const [pendingKey, setPendingKey] = useState(null)
  const [pasteMode, setPasteMode] = useState(false)
  const [pasteValue, setPasteValue] = useState('')
  const [pasteError, setPasteError] = useState(null)
  const [migrating, setMigrating] = useState(false)
  const [migrateError, setMigrateError] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleEnableNow = async () => {
    setMigrateError(null)
    setMigrating(true)
    try {
      const keyString = generateRawKeyString()
      const state = JSON.parse(JSON.stringify(useStore.getState()))
      await pushEncryptedToFirebase(config, state, keyString)
      saveKeyString(keyString)
      setPendingKey(keyString)
      setEnabled(true)
    } catch {
      setMigrateError(t.firebaseEncryptMigrateFailed)
    } finally {
      setMigrating(false)
    }
  }

  const handleConfirmShow = () => {
    setPendingKey(loadKeyString())
    setShowKey(true)
  }

  const handleCopy = async () => {
    if (!pendingKey) return
    await navigator.clipboard.writeText(pendingKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePasteKey = async () => {
    setPasteError(null)
    if (!validateKeyString(pasteValue)) { setPasteError(t.firebaseKeyInvalid); return }
    saveKeyString(pasteValue.trim())
    try {
      const remote = await pullFromFirebase(config)
      if (remote) useStore.getState().importData(remote)
    } catch {
      setPasteError(t.firebaseKeyWrongOrUnreadable)
      return
    }
    setEnabled(true)
    setPasteMode(false)
    setPasteValue('')
  }

  if (!enabled) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t.firebaseEncryptionOffTitle}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{t.firebaseEncryptionOffDesc}</p>

        {!pasteMode ? (
          <div className="space-y-2">
            <Button className="w-full gap-2" variant="outline" onClick={handleEnableNow} disabled={migrating}>
              {migrating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              {t.firebaseEncryptNow}
            </Button>
            <button onClick={() => setPasteMode(true)}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
              {t.firebaseHaveKeyAlready}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-mono resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition"
              rows={2}
              placeholder={t.firebaseKeyPastePlaceholder}
              value={pasteValue}
              onChange={e => { setPasteValue(e.target.value); setPasteError(null) }}
            />
            {pasteError && <p className="text-xs text-destructive">{pasteError}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setPasteMode(false); setPasteValue(''); setPasteError(null) }}>
                {t.cancel}
              </Button>
              <Button className="flex-1" onClick={handlePasteKey} disabled={!pasteValue.trim()}>
                {t.confirm}
              </Button>
            </div>
          </div>
        )}

        {migrateError && <p className="text-xs text-destructive">{migrateError}</p>}

        {pendingKey && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
            <p className="text-xs font-medium">{t.firebaseRecoveryKeyShownOnceTitle}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{t.firebaseRecoveryKeyShownOnceDesc}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-md bg-background border border-border px-2 py-1.5 text-[11px]">{pendingKey}</code>
              <button onClick={handleCopy} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setPendingKey(null)}>{t.firebaseKeySavedItConfirm}</Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{t.firebaseEncryptionOnTitle}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{t.firebaseEncryptionOnDesc}</p>
      <button onClick={() => setConfirmShow(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <KeyRound className="h-3.5 w-3.5" /> {t.firebaseShowRecoveryKey}
      </button>

      {showKey && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-md bg-background border border-border px-2 py-1.5 text-[11px]">
              {loadKeyString()}
            </code>
            <button onClick={async () => {
              await navigator.clipboard.writeText(loadKeyString() ?? '')
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setShowKey(false)}>{t.cancel}</Button>
        </div>
      )}

      <ConfirmDialog open={confirmShow} onOpenChange={setConfirmShow}
        title={t.firebaseShowRecoveryKeyConfirmTitle} description={t.firebaseShowRecoveryKeyConfirmDesc}
        destructive={false} onConfirm={handleConfirmShow} />
    </div>
  )
}

function KeyRequiredPrompt({ config, t, onResolved }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    if (!validateKeyString(value)) { setError(t.firebaseKeyInvalid); return }
    setBusy(true)
    saveKeyString(value.trim())
    try {
      const remote = await pullFromFirebase(config)
      if (remote) useStore.getState().importData(remote)
      onResolved()
    } catch {
      setError(t.firebaseKeyWrongOrUnreadable)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-destructive" />
        <span className="text-sm font-medium">{t.firebaseKeyRequiredTitle}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{t.firebaseKeyRequiredDesc}</p>
      <textarea
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-mono resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition"
        rows={2}
        placeholder={t.firebaseKeyPastePlaceholder}
        value={value}
        onChange={e => { setValue(e.target.value); setError(null) }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button className="w-full" onClick={handleSubmit} disabled={!value.trim() || busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.confirm}
      </Button>
    </div>
  )
}

function ConnectedView({ config, syncStatus, t, onDisconnect }) {
  const [keyResolved, setKeyResolved] = useState(false)
  const showKeyPrompt = syncStatus === 'key-required' && !keyResolved

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {syncStatus === 'syncing'
            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            : <div className="h-2 w-2 rounded-full bg-primary" />
          }
          <span className="text-sm font-medium">{t.firebaseConnected}</span>
        </div>
        {syncStatus === 'error' && (
          <span className="text-xs text-destructive">{t.firebaseError}</span>
        )}
      </div>
      {syncStatus === 'remote-newer' && (
        <p className="text-xs text-destructive leading-relaxed">{t.firebaseRemoteNewer}</p>
      )}
      <p className="text-xs text-muted-foreground font-mono">{config.projectId}</p>

      {loadCollabRulesTag() !== 1 && <UnauthenticatedWarning t={t} />}

      {showKeyPrompt && (
        <KeyRequiredPrompt config={config} t={t} onResolved={() => setKeyResolved(true)} />
      )}

      <EncryptionSection config={config} t={t} />

      <button onClick={onDisconnect}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <CloudOff className="h-3.5 w-3.5" /> {t.firebaseDisconnect}
      </button>
    </div>
  )
}

function parseFirebaseConfig(raw) {
  const trimmed = raw.trim()
  try { return JSON.parse(trimmed) } catch {}
  // Strip JS variable declaration and trailing semicolon, then extract the object literal
  const match = trimmed.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('no object found')
  // Quote unquoted keys: word: → "word":
  const jsonified = match[0].replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
  return JSON.parse(jsonified)
}

export function FirebaseGuideModal({ onClose, syncStatus }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const [config, setConfig] = useState(() => loadFirebaseConfig())
  const [step, setStep] = useState(0)
  const [raw, setRaw] = useState('')
  const [error, setError] = useState(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleDisconnect = () => {
    forceSaveState(useStore.getState())
    clearFirebaseConfig()
    setConfig(null)
    setRaw('')
    setStep(0)
    setError(null)
  }

  const handleSave = async () => {
    setError(null)
    let parsed
    try { parsed = parseFirebaseConfig(raw) } catch { setError(t.firebaseConfigInvalid); return }
    if (!parsed.apiKey || !parsed.projectId) { setError(t.firebaseConfigInvalid); return }
    setTesting(true)
    try {
      await validateFirebaseConfig(parsed)
      saveFirebaseConfig(parsed)
      setConfig(parsed)
    } catch {
      setError(t.firebaseTestFailed)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="flex min-h-screen flex-col items-center justify-center py-16 px-8">
        <div className="w-full max-w-xs space-y-8">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight">{t.firebaseSetupTitle}</h2>
            <button onClick={onClose} className="mt-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {config
            ? <ConnectedView config={config} syncStatus={syncStatus} t={t} onDisconnect={handleDisconnect} />
            : (
              <div className="space-y-6">
                <div className="space-y-5">
                  {STEPS.map((key, i) => (
                    <SetupStep key={key} titleKey={key} t={t}
                      active={i === step} done={i < step}
                      onClick={() => i < step && setStep(i)} />
                  ))}
                </div>

                {step < 3
                  ? <Button className="w-full" onClick={() => setStep(s => s + 1)}>
                      {lang === 'pt' ? 'Próximo' : 'Next'}
                    </Button>
                  : (
                    <div className="space-y-2">
                      <textarea
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-mono resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition"
                        rows={5}
                        placeholder={t.firebaseConfigPlaceholder}
                        value={raw}
                        onChange={e => { setRaw(e.target.value); setError(null) }}
                      />
                      {error && <p className="text-xs text-destructive">{error}</p>}
                      <Button className="w-full" onClick={handleSave} disabled={!raw.trim() || testing}>
                        {testing
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />{t.firebaseSyncing}</>
                          : t.firebaseSave}
                      </Button>
                      <div className="rounded-lg border border-border bg-secondary/40 p-3">
                        <p className="text-xs font-medium mb-2">{t.firebaseRulesTemplateLink}</p>
                        <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">{RULES_SNIPPET}</pre>
                      </div>
                    </div>
                  )
                }
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}

export function FirebaseSyncButton({ syncStatus }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const [open, setOpen] = useState(false)
  const connected = !!loadFirebaseConfig()

  return (
    <>
      <Button variant="outline" className="col-span-2 gap-2 w-full" onClick={() => setOpen(true)}>
        {syncStatus === 'syncing'
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Cloud className="h-4 w-4" />
        }
        {connected ? t.firebaseConnected : t.firebaseSync}
      </Button>
      {open && <FirebaseGuideModal onClose={() => setOpen(false)} syncStatus={syncStatus} />}
    </>
  )
}
