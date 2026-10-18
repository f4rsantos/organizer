import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({ icon: Icon = CalendarDays, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-16 text-center animate-in fade-in duration-300', className)}>
      {Icon && <Icon className="mb-1 h-9 w-9 text-muted-foreground/40" strokeWidth={1.5} />}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
