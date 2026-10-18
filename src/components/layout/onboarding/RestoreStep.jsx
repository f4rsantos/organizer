import { useRef, useState } from 'react'
import { AlertCircle, Cloud, FileJson, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { importState } from '@/store/persist'
import { inspectRemoteState, loadFirebaseConfig, pullFromFirebase } from '@/lib/firebase'
import { describeFirebaseError } from '@/lib/firebaseErrors'
import { restoreFromRemote, RESTORE_TIMEOUT } from '@/lib/sync/restoreRemote'
import { useFirebaseConnect } from '@/hooks/useFirebaseConnect'
import { ConnectUnlockPrompt, FirebaseConfigInput } from '@/components/settings/FirebaseSyncPanel'
import { ChoiceCard } from './ChoiceCard'
import { StepHeading } from './StepHeading'

const KEY_REQUIRED = 'encryption-key-required'

function restoreErrorText(err, t) {
  if (err?.message === RESTORE_TIMEOUT) return t.obRestoreTimeout
  return describeFirebaseError(err, t)
}

function fileErrorText(err, t) {
  if (err?.message === KEY_REQUIRED) return t.firebaseKeyRequiredForImport
  return t.obFileInvalid
}

const OUTCOME_TEXT_KEYS = { empty: 'obRestoreEmpty', newer: 'obRestoreNewer', invalid: 'obFileInvalid' }

function RestoreStatus({ t, status, onRetry, onStartFresh }) {
  if (status.phase === 'working') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        <span>{t.obRestoreWorking}</span>
      </div>
    )
  }
  if (status.phase !== 'error') return null
  return (
    <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex gap-2.5 text-sm">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <p className="leading-relaxed">{status.message}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {status.retry && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onRetry}>
            <RotateCcw className="h-3.5 w-3.5" /> {t.obRetry}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onStartFresh}>{t.obContinueFresh}</Button>
      </div>
    </div>
  )
}

function FirebasePanel({ t, unlock, connection, onUnlocked, onCancelUnlock }) {
  if (unlock) return <ConnectUnlockPrompt t={t} pending={unlock} onUnlocked={onUnlocked} onCancel={onCancelUnlock} />
  if (connection.pending) {
    return <ConnectUnlockPrompt t={t} pending={connection.pending}
      onUnlocked={connection.completePending} onCancel={connection.cancelPending} />
  }
  return <FirebaseConfigInput t={t} connection={connection} className="animate-in fade-in slide-in-from-top-1 duration-200" />
}

export function RestoreStep({ t, onDone, onSyncRestored, onChoosePath }) {
  const importData = useStore(s => s.importData)
  const [status, setStatus] = useState({ phase: 'idle' })
  const [showFirebase, setShowFirebase] = useState(false)
  const [unlock, setUnlock] = useState(null)
  const fileRef = useRef(null)
  const working = status.phase === 'working'

  const restoreFrom = async config => {
    setShowFirebase(false)
    setUnlock(null)
    setStatus({ phase: 'working' })
    try {
      const outcome = await restoreFromRemote({ config, pull: pullFromFirebase, importData })
      if (outcome.status === 'restored') {
        onSyncRestored?.()
        onDone()
        return
      }
      setStatus({ phase: 'error', message: t[OUTCOME_TEXT_KEYS[outcome.status]], retry: false })
    } catch (err) {
      if (err?.message === KEY_REQUIRED) {
        setUnlock({ config, remote: await inspectRemoteState(config) })
        setShowFirebase(true)
        setStatus({ phase: 'idle' })
        return
      }
      setStatus({ phase: 'error', message: restoreErrorText(err, t), retry: true })
    }
  }

  const connection = useFirebaseConnect({ t, onConnected: restoreFrom })

  const startFirebase = () => {
    const saved = loadFirebaseConfig()
    if (saved) {
      restoreFrom(saved)
      return
    }
    setShowFirebase(v => !v)
  }

  const handleFile = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setStatus({ phase: 'working' })
    try {
      importData(await importState(file), { preferLocalSettings: false })
      onDone()
    } catch (err) {
      setStatus({ phase: 'error', message: fileErrorText(err, t), retry: false })
    }
  }

  return (
    <div>
      <StepHeading title={t.obRestoreTitle} desc={t.obRestoreStepDesc} />
      <div className="space-y-3">
        <ChoiceCard icon={Cloud} title={t.obRestoreFirebase} desc={t.obRestoreFirebaseDesc}
          selected={showFirebase} disabled={working} onClick={startFirebase} />
        {showFirebase && (
          <FirebasePanel t={t} unlock={unlock} connection={connection}
            onUnlocked={() => restoreFrom(unlock.config)} onCancelUnlock={() => setUnlock(null)} />
        )}
        <ChoiceCard icon={FileJson} title={t.obRestoreFile} desc={t.obRestoreFileDesc}
          disabled={working} onClick={() => fileRef.current?.click()} />
        <RestoreStatus t={t} status={status} onRetry={startFirebase} onStartFresh={() => onChoosePath('fresh')} />
      </div>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
    </div>
  )
}
