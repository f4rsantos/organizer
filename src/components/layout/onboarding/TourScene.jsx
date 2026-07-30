import { cn } from '@/lib/utils'

export function TourFrame({ children, className }) {
  return (
    <div className={cn(
      'tour-scene relative h-[8.5rem] w-full overflow-hidden rounded-2xl border border-border bg-card',
      className,
    )}>
      {children}
    </div>
  )
}

export function TourScene({ title, desc, children, className }) {
  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <div className={cn('flex w-full max-w-[19rem] flex-col gap-2', className)}>
        {children}
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="max-w-xs text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}
