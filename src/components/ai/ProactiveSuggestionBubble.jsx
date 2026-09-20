import { useEffect, useRef } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'

export function ProactiveSuggestionBubble() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const suggestion = useStore(s => s.proactiveSuggestion)
  const clearProactiveSuggestion = useStore(s => s.clearProactiveSuggestion)
  const openProactiveSuggestion = useStore(s => s.openProactiveSuggestion)
  const isIconsOnly = (useStore(s => s.settings?.navbar?.labelMode) ?? 'both') === 'icons'
  const bubbleRef = useRef(null)
  const openedAt = useRef(0)

  useEffect(() => {
    if (!suggestion) return
    openedAt.current = Date.now()
  }, [suggestion])

  useEffect(() => {
    if (!suggestion) return
    const onPointerDown = e => {
      if (Date.now() - openedAt.current < 200) return
      if (bubbleRef.current && !bubbleRef.current.contains(e.target)) {
        clearProactiveSuggestion()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [suggestion, clearProactiveSuggestion])

  if (!suggestion) return null

  return (
    <div className={cn('fixed inset-x-0 z-50 flex justify-center px-4-safe', isIconsOnly ? 'bottom-above-tab-bar-compact' : 'bottom-above-tab-bar')}>
      <div ref={bubbleRef}
        className="flex w-full max-w-sm items-start gap-2 rounded-xl bg-background/95 shadow-xl ring-1 ring-black/5 dark:ring-white/10 p-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-xs text-foreground leading-relaxed">{suggestion.text}</p>
          <button type="button" onClick={() => openProactiveSuggestion(suggestion)}
            className="text-xs font-medium text-primary hover:underline">
            {t.aiProactiveOpenInAssistant}
          </button>
        </div>
        <button type="button" onClick={clearProactiveSuggestion} aria-label={t.aiDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
