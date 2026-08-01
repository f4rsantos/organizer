import { useEffect, useState } from 'react'
import { Loader2, Lock, LockOpen, ShieldAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { forceSaveState } from '@/store/persist'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { getEncMode, getHint, MODE_OFF, stripTransient } from '@/lib/crypto'
import { loadFirebaseConfig, pushEnabledContainer } from '@/lib/firebase'
import { isUnlocked } from '@/lib/crypto/encryptionService'
import {
  readLocalWraps, enableLocalEncryption, unlockLocal, changeLocalPassphrase,
  regenerateLocalRecoveryCode, updateLocalHint, rotateLocalKey, disableLocalEncryption,
} from '@/lib/crypto/localEnable'
import { EnableEncryptionDialog } from './EnableEncryptionDialog'
import { KeyManagementPanel } from './KeyManagementPanel'
import { SecretPrompt } from './SecretPrompt'

function resave() {
  return forceSaveState(useStore.getState())
}

function syncTargetForEnable() {
  const config = loadFirebaseConfig()
  if (!config) return null
  return {
    state: stripTransient(JSON.parse(JSON.stringify(useStore.getState()))),
    pushContainer: payload => pushEnabledContainer(config, payload),
  }
}

function EncryptionModal({ onClose }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const [mode, setMode] = useState(() => getEncMode())
  const [wraps, setWraps] = useState(() => readLocalWraps())
  const [unlocked, setUnlocked] = useState(() => isUnlocked())
  const [enabling, setEnabling] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const refresh = () => {
    setMode(getEncMode())
    setWraps(readLocalWraps())
    setUnlocked(isUnlocked())
  }

  const handleDisable = async () => {
    setBusy(true)
    try {
      await disableLocalEncryption({ resave })
      refresh()
    } finally {
      setBusy(false)
    }
  }

  const body = () => {
    if (enabling) {
      return (
        <EnableEncryptionDialog
          t={t}
          onEnable={args => enableLocalEncryption({ ...args, resave, syncTarget: syncTargetForEnable() })}
          onDone={() => { setEnabling(false); refresh() }}
          onCancel={() => { setEnabling(false); refresh() }}
        />
      )
    }

    if (mode === MODE_OFF) {
      return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t.encOffTitle}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{t.encOffDesc}</p>
          <Button className="w-full" variant="outline" onClick={() => setEnabling(true)}>
            {t.encEnableAction}
          </Button>
        </div>
      )
    }

    if (!unlocked) {
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">{t.encUnlockTitle}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{t.encLockedDesc}</p>
          <SecretPrompt t={t} hint={getHint(wraps)} submitLabel={t.encUnlockTitle}
            onUnlock={async ({ slot, secret }) => {
              await unlockLocal({ slot, secret })
              refresh()
            }} />
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <KeyManagementPanel
          t={t}
          hint={getHint(wraps)}
          onChangePassphrase={async args => {
            const result = await changeLocalPassphrase(args)
            refresh()
            return result
          }}
          onRegenerateRecoveryCode={async args => {
            const result = await regenerateLocalRecoveryCode(args)
            refresh()
            return result
          }}
          onSaveHint={hint => {
            updateLocalHint(hint)
            refresh()
            return true
          }}
          onRotateKey={async args => {
            const result = await rotateLocalKey({ ...args, resave })
            refresh()
            return result
          }}
        />

        <button onClick={() => setConfirmDisable(true)} disabled={busy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LockOpen className="h-3.5 w-3.5" />}
          {t.encDisableAction}
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto p-safe">
      <div className="flex min-h-dvh flex-col items-center justify-center py-16 px-8">
        <div className="w-full max-w-xs space-y-8">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight">{t.encTitle}</h2>
            <button onClick={onClose}
              className="mt-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {body()}
        </div>
      </div>

      <ConfirmDialog open={confirmDisable} onOpenChange={setConfirmDisable}
        title={t.encDisableTitle} description={t.encDisableDesc}
        destructive onConfirm={handleDisable} />
    </div>
  )
}

export function EncryptionButton() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const [open, setOpen] = useState(false)
  const locked = getEncMode() !== MODE_OFF

  return (
    <>
      <Button variant="outline" className="col-span-2 gap-2 w-full" onClick={() => setOpen(true)}>
        {locked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
        {locked ? t.encTitle : t.encEnableAction}
      </Button>
      {open && <EncryptionModal onClose={() => setOpen(false)} />}
    </>
  )
}
