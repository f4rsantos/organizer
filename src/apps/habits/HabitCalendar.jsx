import { format } from 'date-fns'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { groupPeriodsForCalendar } from '@/lib/habits'
import { cellSizeFor } from './cellSize'

function Cell({ period, color, size, restLabel }) {
  const accent = color ?? '#22c55e'
  const style = { width: size, height: size }
  if (period.done) {
    style.borderColor = accent
    style.color = accent
  } else if (period.rest) {
    style.borderColor = accent
    style.backgroundColor = accent
  }
  return (
    <div
      title={period.rest ? `${period.key}${restLabel ? ` — ${restLabel}` : ''}` : period.key}
      style={style}
      className={cn(
        'rounded-full flex items-center justify-center shrink-0 transition-colors',
        period.done && (size >= 48 ? 'border-4 bg-transparent' : 'border-[3px] bg-transparent'),
        period.rest && 'border-2 opacity-25',
        !period.done && !period.rest && period.current && 'border-2 border-dashed border-primary/50 bg-transparent',
        !period.done && !period.rest && !period.current && 'border border-border bg-transparent opacity-40',
      )}
    >
      {period.done && <Check style={{ width: size * 0.45, height: size * 0.45 }} strokeWidth={3} />}
    </div>
  )
}

function FillerCell({ size }) {
  return (
    <div className="flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <div className="w-1.5 h-1.5 rounded-full bg-border/50" />
    </div>
  )
}

export function HabitCalendar({ periods, color, restLabel, monthFormat = 'MMMM yyyy' }) {
  const months = groupPeriodsForCalendar(periods)
  if (months.length === 0) return null

  const single = periods.length === 1
  const size = cellSizeFor(periods.length)
  const gap = size >= 48 ? 'gap-2.5' : 'gap-1.5'

  return (
    <div className="space-y-4">
      {months.map(month => (
        <div key={month.key} className="space-y-1.5">
          {months.length > 1 && (
            <p className="text-xs text-muted-foreground">{format(month.start, monthFormat)}</p>
          )}
          <div className="space-y-1.5">
            {month.rows.map(row => (
              <div key={row.key} className={cn('grid grid-cols-7', gap, single && 'justify-items-center')}>
                {row.cells.map((period, i) => (
                  period
                    ? <Cell key={period.key} period={period} color={color} size={size} restLabel={restLabel} />
                    : <FillerCell key={i} size={size} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
