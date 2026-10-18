import { useEffect, useRef, useState } from 'react'
import { QuickActionBar } from '@/components/tasks/QuickActionBar'
import { useLiquidGlass } from '@/hooks/useLiquidGlass'
import { cn } from '@/lib/utils'

const PLAIN_BACKDROP = 'bg-black/50 backdrop-blur-sm'
const GLASS_BACKDROP = 'bg-black/20'
const PLAIN_PANEL = 'bg-background/95 shadow-xl ring-1 ring-black/5 dark:ring-white/10'
const GLASS_PANEL = 'bg-background/45 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/25 dark:ring-white/10 shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_16px_48px_rgb(0_0_0/0.28)]'

export function SpotlightOverlay({ open, onClose }) {
  const [show, setShow] = useState(false)
  const glass = useLiquidGlass()
  const openedAt = useRef(0)

  useEffect(() => {
    if (open) {
      openedAt.current = Date.now()
      return
    }
    const timer = setTimeout(() => setShow(false), 200)
    return () => clearTimeout(timer)
  }, [open])

  const handleBackdropClick = () => {
    if (Date.now() - openedAt.current < 400) return
    onClose()
  }

  if (!open && !show) return null

  return (
    <div data-native-chrome-cover
      className={cn('fixed inset-0 z-[60] flex items-center justify-center p-safe transition-opacity duration-200', glass ? GLASS_BACKDROP : PLAIN_BACKDROP, open ? 'opacity-100' : 'opacity-0')}
      onClick={handleBackdropClick}>
      <div className={`w-full max-w-lg px-4 transition-all duration-200 ${open ? 'scale-100' : 'scale-95 opacity-0'}`}
        onClick={e => e.stopPropagation()}>
        <div className={cn('rounded-2xl overflow-hidden p-1.5', glass ? GLASS_PANEL : PLAIN_PANEL)}>
          <QuickActionBar onDone={onClose} />
        </div>
      </div>
    </div>
  )
}
