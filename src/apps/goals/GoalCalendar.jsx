import { format } from 'date-fns'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { groupPeriodsForCalendar } from '@/lib/goals'
import { cellSizeFor } from './cellSize'

function Cell({ period, color, size }) {
  const style = period.done
    ? { borderColor: color ?? '#22c55e', color: color ?? '#22c55e', width: size, height: size }
    : { width: size, height: size }
  return (
    <div
      title={period.key}
      style={style}
      className={cn(
        'rounded-full flex items-center justify-center shrink-0 transition-colors',
        period.done && (size >= 48 ? 'border-4 bg-transparent' : 'border-[3px] bg-transparent'),
        !period.done && period.current && 'border-2 border-dashed border-primary/50 bg-transparent',
        !period.done && !period.current && 'border border-border bg-transparent opacity-40',
      )}
    >
      {period.done && <Check style={{ width: size * 0.45, height: size * 0.45 }} strokeWidth={3} />}
    </div>
  )
}

export function GoalCalendar({ periods, color, monthFormat = 'MMMM yyyy' }) {
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
              <div key={row.key} className={cn('flex flex-wrap', gap, single && 'justify-center')}>
                {row.cells.map(period => (
                  <Cell key={period.key} period={period} color={color} size={size} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
