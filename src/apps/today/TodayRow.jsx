import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROW_CLASS = 'flex w-full items-center gap-3 px-4 py-2.5 text-left'

export function TodaySection({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-xs font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

export function TodayRow({ leading, title, subtitle, trailing, tone, wrapTitle = false, onClick }) {
  const body = (
    <>
      {leading && <span className="flex w-11 shrink-0 items-center justify-center">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className={cn('block text-sm', !wrapTitle && 'truncate', tone === 'alert' && 'text-destructive')}>{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      {trailing}
      {onClick && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
    </>
  )
  if (!onClick) return <div className={ROW_CLASS}>{body}</div>
  return (
    <button type="button" onClick={onClick} className={cn(ROW_CLASS, 'transition-colors hover:bg-accent/40')}>
      {body}
    </button>
  )
}
