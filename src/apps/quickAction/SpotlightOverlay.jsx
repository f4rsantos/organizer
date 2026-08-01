import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useWeekContext } from '@/hooks/useWeekContext'
import { QuickActionBar } from '@/components/tasks/QuickActionBar'

export function SpotlightOverlay({ open, onClose }) {
  const allClasses = useStore(s => s.classes ?? [])
  const { semester, mode } = useWeekContext()
  const [show, setShow] = useState(false)

  const noneMode = mode === 'none'
  const scopeId = noneMode ? null : (semester?.id ?? null)
  const classes = allClasses.filter(c => c.semesterId === scopeId)

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => setShow(false), 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  if (!open && !show) return null

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center p-safe bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}>
      <div className={`w-full max-w-lg px-4 transition-all duration-200 ${open ? 'scale-100' : 'scale-95 opacity-0'}`}
        onClick={e => e.stopPropagation()}>
        <div className="rounded-2xl bg-background/95 shadow-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden p-1.5">
          <QuickActionBar
            semesterId={scopeId}
            classes={classes}
            onDone={onClose}
            autoFocus={true}
            spotlight={true}
          />
        </div>
      </div>
    </div>
  )
}
