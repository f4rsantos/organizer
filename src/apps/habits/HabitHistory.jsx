import { format } from 'date-fns'
import { parseDayKey } from '@/lib/habits'
import { HabitCalendar } from './HabitCalendar'

export function HabitHistory({ habit, periods, completion, message, t }) {
  const notes = periods.filter(p => p.done && p.note).reverse()

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-4 py-4">
      <div className="w-full max-w-md flex justify-center">
        <HabitCalendar periods={periods} color={habit.color} restLabel={t.habitRestDay} />
      </div>

      {message && <p className="text-sm font-medium text-center">{message}</p>}

      {completion?.kind === 'count' && (
        <p className="text-xs text-muted-foreground text-center">
          {completion.done ? t.habitTargetReached : t.habitTargetRemaining(completion.remaining)}
        </p>
      )}
      {completion?.kind === 'date' && completion.daysLeft !== null && (
        <p className="text-xs text-muted-foreground text-center">
          {completion.done ? t.habitTargetReached : t.habitTargetDaysLeft(completion.daysLeft)}
        </p>
      )}

      {notes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t.habitNotesTitle}</p>
          {notes.map(period => {
            const date = parseDayKey(period.key)
            return (
              <div key={period.key} className="rounded-lg border border-border bg-card p-2.5">
                <p className="text-xs text-muted-foreground">{date ? format(date, 'PP') : period.key}</p>
                <p className="text-sm">{period.note}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
