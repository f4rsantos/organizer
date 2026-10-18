import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ChoiceCard({ icon: Icon, title, desc, selected = false, emphasis = false, onClick, disabled = false }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={selected}
      className={cn(
        'group relative flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:pointer-events-none disabled:opacity-50',
        selected ? 'border-primary bg-primary/[0.06] ring-1 ring-primary' : 'border-border bg-card hover:border-foreground/20',
        emphasis && !selected && 'border-primary/50',
      )}>
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0 transition-colors',
        selected || emphasis ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-sm font-semibold leading-snug">{title}</span>
        {desc && <span className="block text-xs leading-relaxed text-muted-foreground">{desc}</span>}
      </span>
      {selected && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
