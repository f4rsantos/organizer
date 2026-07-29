import { startOfWeek, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { itemsForDay } from './calendarUtils'

const MAX_CHIPS = 3

function Chip({ color, children, onClick }) {
  return (
    <div onClick={onClick} title={typeof children === 'string' ? children : undefined}
      className="text-[10px] leading-tight px-1 rounded truncate cursor-pointer"
      style={{ backgroundColor: color + '33', color }}>
      {children}
    </div>
  )
}

function DayCell({ day, isCurrentMonth, tasks, holidays, events, classes, onOpen }) {
  const isToday = isSameDay(day, new Date())
  const { dayHolidays, dayEvents, dayTasks } = itemsForDay(day, tasks, holidays, events)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const chips = [
    ...dayHolidays.map(h => ({ key: 'h' + h.id, color: '#d97706', label: h.name })),
    ...dayEvents.map(e => ({ key: 'e' + e.id, color: e.color ?? '#6366f1', label: e.title })),
    ...dayTasks.map(tk => {
      const cls = classes.find(c => c.id === tk.classId)
      return { key: 't' + tk.id, color: cls?.color ?? '#6366f1', label: cls ? `${tk.title} - ${cls.name}` : tk.title }
    }),
  ]
  const shown = chips.slice(0, MAX_CHIPS)
  const overflow = chips.length - shown.length

  return (
    <button type="button" onClick={() => onOpen(day)}
      className={`min-h-[72px] text-left p-1 border-b border-r border-border/40 flex flex-col gap-0.5 transition-colors hover:bg-accent/40 ${!isCurrentMonth ? 'opacity-30' : ''}`}>
      <span className={`text-xs font-medium self-start leading-none mb-0.5 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
        {format(day, 'd')}
      </span>
      {shown.map(c => <Chip key={c.key} color={c.color}>{c.label}</Chip>)}
      {overflow > 0 && (
        <span className="text-[10px] leading-tight px-1 text-muted-foreground font-medium">+{overflow} {t.more}</span>
      )}
    </button>
  )
}

export function MonthView({ month, tasks, holidays, events, classes, onOpenDay }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const monthStart = startOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: new Date(Math.min(
    endOfMonth(month).getTime(),
    new Date(gridStart.getTime() + 41 * 24 * 60 * 60 * 1000).getTime()
  )) })
  while (days.length < 42) days.push(new Date(days[days.length - 1].getTime() + 86400000))

  const DOW = t.weekdaysShort

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 border-t border-l border-border/40">
        {DOW.map(d => (
          <div key={d} className="text-[10px] font-semibold text-muted-foreground text-center py-1.5 border-b border-r border-border/40 uppercase tracking-wide">
            {d}
          </div>
        ))}
        {days.map(day => (
          <DayCell key={day.toISOString()} day={day} isCurrentMonth={isSameMonth(day, month)}
            tasks={tasks} holidays={holidays} events={events} classes={classes} onOpen={onOpenDay} />
        ))}
      </div>
    </div>
  )
}
