import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Link, QrCode } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { encodeStateToUrl } from '@/lib/shareUtils'

const QR_MAX_CHARS = 2800

export function SharePanel() {
  const state = useStore(s => s)
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [showQr, setShowQr] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(await encodeStateToUrl(state))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleQr = async () => {
    if (showQr) { setShowQr(false); return }
    const url = await encodeStateToUrl(state)
    if (url.length > QR_MAX_CHARS) {
      setQrDataUrl('toolarge')
    } else {
      const { default: QRCode } = await import('qrcode')
      const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 })
      setQrDataUrl(dataUrl)
    }
    setShowQr(true)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 gap-2" onClick={handleCopy}>
          <Link className="h-4 w-4" />
          {copied ? 'Copied!' : 'Copy share link'}
        </Button>
        <Button variant="outline" className="flex-1 gap-2" onClick={handleQr}>
          <QrCode className="h-4 w-4" />
          QR Code
        </Button>
      </div>
      {showQr && (
        <div className="flex justify-center pt-1">
          {qrDataUrl === 'toolarge'
            ? <p className="text-xs text-muted-foreground text-center">Data too large for QR. Use the JSON export instead.</p>
            : <img src={qrDataUrl} alt="QR code" className="rounded-lg border border-border" width={200} height={200} />
          }
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        The link encodes all your data. Share it to load on another device.
        For large datasets, use JSON export instead.
      </p>
    </div>
  )
}
