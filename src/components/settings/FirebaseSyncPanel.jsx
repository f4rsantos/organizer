import { useEffect, useState } from 'react'
import { CheckCircle2, CircleDashed, CloudOff, Cloud, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import {
  loadFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig, validateFirebaseConfig,
} from '@/lib/firebase'
import { forceSaveState } from '@/store/persist'

const STEPS = ['firebaseStep1', 'firebaseStep2', 'firebaseStep3', 'firebaseStep4']

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

function ConnectedView({ config, syncStatus, t, onDisconnect }) {
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
      <p className="text-xs text-muted-foreground font-mono">{config.projectId}</p>
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
