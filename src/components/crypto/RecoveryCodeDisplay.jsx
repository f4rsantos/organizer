import { useState } from 'react'
import { Copy, Check, QrCode, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'

export function RecoveryCodeDisplay({ t, recoveryCode, onAcknowledge, acknowledgeLabel }) {
  const { copied, copy } = useCopyToClipboard()
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [confirmed, setConfirmed] = useState(false)

  const words = recoveryCode.split(' ')

  const handleCopy = () => copy(recoveryCode)

  const handleQr = async () => {
    if (qrDataUrl) { setQrDataUrl(null); return }
    const QRCode = (await import('qrcode')).default
    setQrDataUrl(await QRCode.toDataURL(recoveryCode, { width: 320, margin: 1 }))
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t.encRecoveryCodeTitle}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{t.encRecoveryCodeDesc}</p>
      </div>

      <ol className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg border border-border bg-background p-3">
        {words.map((word, i) => (
          <li key={`${i}-${word}`} className="flex gap-2 text-sm font-mono">
            <span className="w-5 shrink-0 text-right text-muted-foreground">{i + 1}</span>
            <span>{word}</span>
          </li>
        ))}
      </ol>

      <p className="text-xs text-muted-foreground">{t.encRecoveryCodeWordsNote}</p>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex gap-2.5">
        <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">{t.encEnableWarning}</p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 gap-2" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {t.copy ?? 'Copy'}
        </Button>
        <Button variant="outline" className="flex-1 gap-2" onClick={handleQr}>
          <QrCode className="h-3.5 w-3.5" />
          {t.encRecoveryCodeQr}
        </Button>
      </div>

      {qrDataUrl && (
        <div className="space-y-2 rounded-lg border border-border bg-background p-3">
          <img src={qrDataUrl} alt={t.encRecoveryCodeQr} className="mx-auto max-w-full" />
          <p className="text-center text-xs text-muted-foreground">{t.encRecoveryCodeQrDesc}</p>
        </div>
      )}

      <label className="flex items-center gap-2.5 text-xs">
        <Checkbox checked={confirmed} onCheckedChange={setConfirmed} />
        <span>{t.encRecoveryCodeSavedConfirm}</span>
      </label>

      <Button className="w-full" onClick={onAcknowledge} disabled={!confirmed}>
        {acknowledgeLabel ?? t.confirm}
      </Button>
    </div>
  )
}
