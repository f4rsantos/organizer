import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Link, QrCode } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { encodeStateToUrl } from '@/lib/shareUtils'

export function SharePanel() {
  const state = useStore(s => s)
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [showQr, setShowQr] = useState(false)
  const urlRef = useRef(null)

  const getUrl = () => {
    const { setCourseAvg, setSemesterFinalGrade, setGradeComponents, setTargetGrade,
      addTask, toggleTask, updateTask, deleteTask, addKanbanCard, updateKanbanCard,
      moveKanbanCard, deleteKanbanCard, clearKanbanDone, wipeKanban, addKanbanColumn,
      updateKanbanColumn, deleteKanbanColumn, addClass, updateClass, deleteClass,
      addSemester, updateSemester, deleteSemester, setActiveSemester,
      setTheme, setLang, completeOnboarding, updateSettings, importData,
      ...data } = state
    return encodeStateToUrl(data)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleQr = async () => {
    if (showQr) { setShowQr(false); return }
    const url = getUrl()
    if (url.length > 4000) {
      setQrDataUrl('toolarge')
    } else {
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
