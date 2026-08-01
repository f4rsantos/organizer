import { useEffect } from 'react'
import { GuidesPage } from './GuidesPage'

export function GuidesOverlay({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-background p-safe">
      <GuidesPage onClose={onClose} />
    </div>
  )
}
