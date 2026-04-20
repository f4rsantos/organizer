import { CalendarDays } from 'lucide-react'

export function EmptyState({ icon: Icon = CalendarDays, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {Icon && <Icon className="h-10 w-10 text-muted-foreground/40" />}
      <p className="font-medium text-muted-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground/70 max-w-xs">{description}</p>}
    </div>
  )
}
