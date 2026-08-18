import { useEffect, useState } from 'react'
import { CheckCircle2, CircleDashed, CloudOff, Cloud, Loader2, X, ShieldAlert, ShieldCheck, KeyRound, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import {
  loadFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig, validateFirebaseConfig,
  loadCollabRulesTag, pullFromFirebase, inspectRemoteState, pushEnabledContainer, pushWraps,
  fetchStateContainer, publishRotation,
} from '@/lib/firebase'
import { forceSaveState } from '@/store/persist'
import { stripTransient, getHint, putDek } from '@/lib/crypto'
import { isUnlocked, unlockWithSecret, openStore } from '@/lib/crypto/encryptionService'
import {
  enableSyncEncryption, updatePassphrase, replaceRecoveryCode, updateHint, rotateSyncKey,
} from '@/lib/crypto/syncEnable'
import { EnableEncryptionDialog } from '@/components/crypto/EnableEncryptionDialog'
import { KeyManagementPanel } from '@/components/crypto/KeyManagementPanel'
import { PlaintextSyncWarning } from '@/components/crypto/PlaintextSyncWarning'
import { SecretPrompt } from '@/components/crypto/SecretPrompt'
import { RulesBox } from '@/components/settings/RulesBox'

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

function SetupStep({ titleKey, t, active, done, onClick, children }) {
  return (
    <div className={`flex gap-3 transition-opacity cursor-default ${active || done ? 'opacity-100' : 'opacity-35'} ${done ? 'cursor-pointer' : ''}`}
      onClick={onClick}>
      <div className="mt-0.5 shrink-0">
        {done
          ? <CheckCircle2 className="h-4 w-4 text-primary" />
          : <CircleDashed className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
        }
      </div>
      <div className="space-y-1.5 min-w-0">
        <p className="text-sm font-medium leading-snug">{t[titleKey + 'Title']}</p>
        {active && (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">{t[titleKey + 'Desc']}</p>
            {children}
          </>
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
        <RulesBox label={t.firebaseRulesTemplateLink} snippet={RULES_SNIPPET} />
      </div>
    </div>
  )
}

function EncryptionSection({ config, t, remote, onRemoteChange }) {
  const [enabling, setEnabling] = useState(false)

  const encryptionOn = remote?.encrypted && remote?.hasWraps && isUnlocked()

  const handleEnable = async ({ passphrase, hint }) => {
    const state = stripTransient(JSON.parse(JSON.stringify(useStore.getState())))
    const result = await enableSyncEncryption({
      passphrase,
      hint,
      state,
      pushContainer: payload => pushEnabledContainer(config, payload),
    })
    await forceSaveState(useStore.getState())
    return result
  }

  const handleDone = async () => {
    setEnabling(false)
    onRemoteChange(await inspectRemoteState(config))
  }

  const pushWrapsToRemote = wraps => pushWraps(config, wraps)

  if (enabling) {
    return (
      <EnableEncryptionDialog
        t={t}
        onEnable={handleEnable}
        onDone={handleDone}
        onCancel={() => setEnabling(false)}
      />
    )
  }

  if (encryptionOn) {
    return (
      <KeyManagementPanel
        t={t}
        hint={getHint(remote.wraps)}
        onChangePassphrase={async args => {
          const result = await updatePassphrase({ ...args, wraps: remote.wraps, pushWraps: pushWrapsToRemote })
          onRemoteChange(await inspectRemoteState(config))
          return result
        }}
        onRegenerateRecoveryCode={async args => {
          const result = await replaceRecoveryCode({ ...args, wraps: remote.wraps, pushWraps: pushWrapsToRemote })
          onRemoteChange(await inspectRemoteState(config))
          return result
        }}
        onSaveHint={async hint => {
          await updateHint({ wraps: remote.wraps, hint, pushWraps: pushWrapsToRemote })
          onRemoteChange(await inspectRemoteState(config))
          return true
        }}
        onRotateKey={async args => {
          const container = await fetchStateContainer(config)
          if (!container) throw new Error('sync-doc-missing')
          const result = await rotateSyncKey({
            ...args,
            container,
            wraps: remote.wraps,
            publishRotation: payload => publishRotation(config, payload),
            commitDek: async dek => {
              await openStore()
              await putDek(dek)
            },
          })
          await forceSaveState(useStore.getState())
          onRemoteChange(await inspectRemoteState(config))
          return result
        }}
      />
    )
  }

  if (remote?.encrypted) {
    return (
      <p className="text-xs text-destructive leading-relaxed">
        {remote?.hasWraps ? t.encRemoteAlreadyEncrypted : t.encRemoteUnrecoverable}
      </p>
    )
  }

  return <PlaintextSyncWarning t={t} onEnable={() => setEnabling(true)} />
}

function UnlockRemotePrompt({ config, t, remote, onUnlocked }) {
  const handleUnlock = async ({ slot, secret }) => {
    await unlockWithSecret({
      wraps: remote.wraps,
      slot,
      secret,
      expectedDekId: remote.dekId,
    })
    const pulled = await pullFromFirebase(config)
    if (pulled) useStore.getState().importData(pulled, { preferLocalSettings: false })
    onUnlocked()
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-destructive" />
        <span className="text-sm font-medium">{t.encUnlockTitle}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{t.encRemoteAlreadyEncrypted}</p>
      <SecretPrompt t={t} hint={getHint(remote.wraps)} onUnlock={handleUnlock}
        submitLabel={t.encUnlockTitle} autoFocus={false} />
    </div>
  )
}

function ConnectedView({ config, syncStatus, t, onDisconnect }) {
  const [remote, setRemote] = useState(null)
  const [unlocked, setUnlocked] = useState(() => isUnlocked())

  useEffect(() => {
    let cancelled = false
    inspectRemoteState(config)
      .then(info => {
        if (cancelled) return
        setRemote(info)
        setUnlocked(isUnlocked())
      })
      .catch(() => { if (!cancelled) setRemote(null) })
    return () => { cancelled = true }
  }, [config, syncStatus])

  const needsRemoteUnlock = Boolean(
    remote?.encrypted && remote?.hasWraps && !unlocked,
  )
  const unrecoverable = Boolean(remote?.encrypted && !remote?.hasWraps)

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
      {syncStatus === 'key-required' && !needsRemoteUnlock && (
        <p className="text-xs text-destructive leading-relaxed">{t.encRemoteAlreadyEncrypted}</p>
      )}
      <p className="text-xs text-muted-foreground font-mono">{config.projectId}</p>

      {loadCollabRulesTag() !== 1 && <UnauthenticatedWarning t={t} />}

      {unrecoverable && (
        <p className="text-xs text-destructive leading-relaxed">{t.encRemoteUnrecoverable}</p>
      )}

      {needsRemoteUnlock && (
        <UnlockRemotePrompt config={config} t={t} remote={remote}
          onUnlocked={async () => {
            setUnlocked(true)
            setRemote(await inspectRemoteState(config))
          }} />
      )}

      {remote && !needsRemoteUnlock && !unrecoverable && (
        <EncryptionSection config={config} t={t} remote={remote} onRemoteChange={setRemote} />
      )}

      <button onClick={onDisconnect}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <CloudOff className="h-3.5 w-3.5" /> {t.firebaseDisconnect}
      </button>
    </div>
  )
}

function ConnectUnlockPrompt({ t, pending, onUnlocked, onCancel }) {
  const handleUnlock = async ({ slot, secret }) => {
    await unlockWithSecret({
      wraps: pending.remote.wraps,
      slot,
      secret,
      expectedDekId: pending.remote.dekId,
    })
    onUnlocked()
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{t.encUnlockTitle}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{t.encRemoteAlreadyEncrypted}</p>
      <SecretPrompt t={t} hint={getHint(pending.remote.wraps)} onUnlock={handleUnlock}
        submitLabel={t.encUnlockTitle} />
      <button onClick={onCancel}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
        {t.cancel}
      </button>
    </div>
  )
}

function parseFirebaseConfig(raw) {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    // Not strict JSON: fall through and try to salvage a JS object literal.
  }
  const match = trimmed.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('no object found')
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
  const [pendingConnect, setPendingConnect] = useState(null)

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
      const remote = await validateFirebaseConfig(parsed)

      if (remote.encrypted && !remote.hasWraps) {
        setError(t.encRemoteUnrecoverable)
        return
      }

      if (remote.encrypted) {
        setPendingConnect({ config: parsed, remote })
        return
      }

      saveFirebaseConfig(parsed)
      setConfig(parsed)
    } catch {
      setError(t.firebaseTestFailed)
    } finally {
      setTesting(false)
    }
  }

  const completePendingConnect = () => {
    saveFirebaseConfig(pendingConnect.config)
    setConfig(pendingConnect.config)
    setPendingConnect(null)
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto p-safe">
      <div className="flex min-h-dvh flex-col items-center justify-center py-16 px-8">
        <div className="w-full max-w-xs space-y-8">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight">{t.firebaseSetupTitle}</h2>
            <button onClick={onClose} className="mt-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {pendingConnect
            ? <ConnectUnlockPrompt t={t} pending={pendingConnect}
                onUnlocked={completePendingConnect}
                onCancel={() => setPendingConnect(null)} />
            : config
            ? <ConnectedView config={config} syncStatus={syncStatus} t={t} onDisconnect={handleDisconnect} />
            : (
              <div className="space-y-6">
                <div className="space-y-5">
                  {STEPS.map((key, i) => (
                    <SetupStep key={key} titleKey={key} t={t}
                      active={i === step} done={i < step}
                      onClick={() => i < step && setStep(i)}>
                      {i === 1 && <RulesBox label={t.firebaseRulesTemplateLink} snippet={RULES_SNIPPET} />}
                    </SetupStep>
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
