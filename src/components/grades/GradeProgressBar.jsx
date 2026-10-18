import { cn } from '@/lib/utils'

function percentOf(value, scale) {
  if (value === null || !scale) return 0
  return Math.max(0, Math.min(100, (value / scale) * 100))
}

export function GradeProgressBar({ score, scale, color, failing }) {
  const filled = percentOf(score, scale)
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
      <div className={cn('h-full rounded-full transition-[width] duration-500', failing && 'bg-destructive')}
        style={{ width: `${filled}%`, backgroundColor: failing ? undefined : color }} />
    </div>
  )
}
