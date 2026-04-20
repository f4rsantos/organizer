import { useEffect } from 'react'
import { PresetPicker } from './PresetPicker'

export function PresetOverlay({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <PresetPicker onBack={onClose} onLoaded={onClose} />
    </div>
  )
}
