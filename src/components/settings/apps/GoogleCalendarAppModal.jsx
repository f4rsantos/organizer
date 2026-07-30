import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Loader2, CheckCircle2, CircleDashed, CloudOff } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { googleCalendarApp } from '@/apps/googleCalendar'
import {
  loadGoogleClientId, saveGoogleClientId, requestAccessToken, disconnectGoogle,
} from '@/apps/googleCalendar/googleAuth'

const STEPS = ['gcalStep1', 'gcalStep2', 'gcalStep3']

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
        {active && <p className="text-xs text-muted-foreground leading-relaxed">{t[titleKey + 'Desc']}</p>}
      </div>
    </div>
  )
}

export function GoogleCalendarAppModal({ open, onOpenChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const apps = useStore(s => s.settings?.apps) ?? {}
  const updateSettings = useStore(s => s.updateSettings)
  const wipeAppData = useStore(s => s.wipeAppData)
  const [confirmOff, setConfirmOff] = useState(false)
  const [clientId, setClientId] = useState(() => loadGoogleClientId())
  const [step, setStep] = useState(0)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  const enabled = apps.googleCalendar === true
  const connected = enabled && !!loadGoogleClientId()

  const handleConnect = async () => {
    setError(null)
    if (!clientId.trim()) { setError(t.gcalClientIdInvalid); return }
    setConnecting(true)
    try {
      saveGoogleClientId(clientId)
      await requestAccessToken({ prompt: 'consent' })
      updateSettings({ apps: { ...apps, googleCalendar: true } })
    } catch {
      setError(t.gcalConnectFailed)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnectConfirmed = () => {
    disconnectGoogle()
    wipeAppData(googleCalendarApp.wipe)
    updateSettings({ apps: { ...apps, googleCalendar: false } })
    setStep(0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.googleCalendar}</DialogTitle>
        </DialogHeader>

        {connected ? (
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-sm font-medium">{t.gcalConnected}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{t.gcalScopeNotice}</p>
            <button onClick={() => setConfirmOff(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <CloudOff className="h-3.5 w-3.5" /> {t.gcalDisconnect}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-xs text-muted-foreground leading-relaxed">{t.gcalScopeNotice}</p>
            <div className="space-y-5">
              {STEPS.map((key, i) => (
                <SetupStep key={key} titleKey={key} t={t}
                  active={i === step} done={i < step}
                  onClick={() => i < step && setStep(i)} />
              ))}
            </div>
            {step < 2 ? (
              <Button className="w-full" onClick={() => setStep(s => s + 1)}>
                {lang === 'pt' ? 'Próximo' : 'Next'}
              </Button>
            ) : (
              <div className="space-y-2">
                <Input value={clientId} onChange={e => { setClientId(e.target.value); setError(null) }}
                  placeholder={t.gcalClientIdPlaceholder} className="font-mono text-xs" />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button className="w-full" onClick={handleConnect} disabled={!clientId.trim() || connecting}>
                  {connecting
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />{t.gcalConnecting}</>
                    : t.gcalConnect}
                </Button>
              </div>
            )}
          </div>
        )}

        {enabled && !connected && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm">{t.gcalEnable}</p>
            <Switch checked={false} onCheckedChange={() => setConfirmOff(true)} />
          </div>
        )}

        <ConfirmDialog open={confirmOff} onOpenChange={setConfirmOff}
          title={t.gcalDisableTitle} description={t.gcalDisableDesc} onConfirm={handleDisconnectConfirmed} />
      </DialogContent>
    </Dialog>
  )
}
