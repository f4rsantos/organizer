import { useEffect } from 'react'
import { Undo2, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { storeQuickActionContext, undoQuickAction } from '@/lib/quickAction/execute'
import { cn } from '@/lib/utils'

const UNDO_WINDOW_MS = 8000

export function QuickActionUndoToast() {
  const entry = useStore(s => s.quickActionUndo)
  const setQuickActionUndo = useStore(s => s.setQuickActionUndo)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const isIconsOnly = useStore(s => (s.settings?.navbar?.labelMode ?? 'both') === 'icons')

  useEffect(() => {
    if (!entry) return
    const id = setTimeout(() => setQuickActionUndo(null), UNDO_WINDOW_MS)
    return () => clearTimeout(id)
  }, [entry, setQuickActionUndo])

  if (!entry) return null

  const undo = () => {
    undoQuickAction(entry.effects, storeQuickActionContext(useStore, { t, now: new Date() }))
    setQuickActionUndo(null)
  }

  return (
    <div className={cn('fixed inset-x-0 z-50 flex justify-center px-4-safe pointer-events-none',
      isIconsOnly ? 'bottom-above-tab-bar-compact' : 'bottom-above-tab-bar')}>
      <div key={entry.at} className="pointer-events-auto flex items-center gap-3 rounded-xl bg-foreground px-4 py-2.5 text-sm text-background shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
        <span>{t.qaDoneSummary(entry.summary)}</span>
        <button type="button" onClick={undo} className="flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
          <Undo2 className="h-3.5 w-3.5" /> {t.qaUndo}
        </button>
        <button type="button" onClick={() => setQuickActionUndo(null)} aria-label={t.cancel} className="opacity-60 hover:opacity-100">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
