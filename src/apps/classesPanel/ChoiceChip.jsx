import { cn } from '@/lib/utils'

export function ChoiceChip({ active, onClick, children }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary/15 text-foreground'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}>
      {children}
    </button>
  )
}
