import { eachDayOfInterval, endOfMonth, isSameDay, isSameMonth, isWithinInterval, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'

function dayHasItems(day, tasks, holidays, events) {
  if (holidays.some(h => isWithinInterval(day, { start: parseISO(h.startDate), end: parseISO(h.endDate) }))) return true
  if (events.some(e => e._range && isWithinInterval(day, e._range))) return true
  if (tasks.some(tk => isWithinInterval(day, tk._range))) return true
  return false
}

function MiniMonth({ year, monthIndex, tasks, holidays, events, onOpenMonth, onOpenDay }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const monthDate = new Date(year, monthIndex, 1)
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: new Date(Math.min(monthEnd.getTime(), gridStart.getTime() + 41 * 86400000)) })
  while (days.length < 42) days.push(new Date(days[days.length - 1].getTime() + 86400000))

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={() => onOpenMonth(monthDate)}
        className="text-xs font-semibold capitalize text-left hover:text-primary transition-colors">
        {t.months[monthIndex]}
      </button>
      <div className="grid grid-cols-7 gap-px">
        {days.map(day => {
          const inMonth = isSameMonth(day, monthDate)
          const isToday = isSameDay(day, new Date())
          const hasItems = inMonth && dayHasItems(day, tasks, holidays, events)
          return (
            <button key={day.toISOString()} type="button" onClick={() => onOpenDay(day)}
              className={`aspect-square text-[8px] flex items-center justify-center rounded-sm transition-colors
                ${!inMonth ? 'opacity-20' : ''}
                ${isToday ? 'bg-primary text-primary-foreground' : hasItems ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:bg-accent/40'}`}>
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function YearView({ year, tasks, holidays, events, onOpenMonth, onOpenDay }) {
  const months = Array.from({ length: 12 }, (_, i) => i)
  return (
    <div className="flex-1 overflow-auto p-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {months.map(m => (
          <MiniMonth key={m} year={year} monthIndex={m} tasks={tasks} holidays={holidays} events={events}
            onOpenMonth={onOpenMonth} onOpenDay={onOpenDay} />
        ))}
      </div>
    </div>
  )
}
