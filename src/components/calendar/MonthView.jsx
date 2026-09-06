import { startOfWeek, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { itemsForDay } from './calendarUtils'
import { readableTextColor } from '@/lib/calendar/contrast'
import { useWeatherForecast } from '@/hooks/useWeatherForecast'
import { WeatherIcon } from './WeatherIcon'

const MAX_CHIPS = 3

const isDark = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

function Chip({ color, children, onClick }) {
  return (
    <div onClick={onClick} title={typeof children === 'string' ? children : undefined}
      className="flex items-center gap-1 text-[10px] leading-tight pl-1 pr-0.5 py-px rounded-sm truncate cursor-pointer"
      style={{ backgroundColor: color + '1f', color: readableTextColor(color, { background: isDark() ? '#1a1a1a' : '#ffffff' }) }}>
      <span className="h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{children}</span>
    </div>
  )
}

function DayCell({ day, isCurrentMonth, tasks, holidays, events, classes, onOpen, weatherByDate }) {
  const isToday = isSameDay(day, new Date())
  const { dayHolidays, dayEvents, dayTasks } = itemsForDay(day, tasks, holidays, events)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const weather = weatherByDate?.get(format(day, 'yyyy-MM-dd'))

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
    <div role="button" tabIndex={0} onClick={() => onOpen(day)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(day) } }}
      className={`min-h-[76px] h-full text-left px-0.5 pt-1 pb-0.5 border-t border-border/25 flex flex-col gap-0.5 overflow-hidden transition-colors hover:bg-accent/30 cursor-pointer ${!isCurrentMonth ? 'opacity-35' : ''}`}>
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <span className={`text-[11px] font-medium leading-none w-[22px] h-[22px] flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
          {format(day, 'd')}
        </span>
        {weather && <WeatherIcon code={weather.code} className="h-3 w-3 text-muted-foreground" />}
      </div>
      {shown.map(c => <Chip key={c.key} color={c.color}>{c.label}</Chip>)}
      {overflow > 0 && (
        <span className="text-[9px] leading-tight px-1 text-muted-foreground">+{overflow} {t.more}</span>
      )}
    </div>
  )
}

export function MonthView({ month, tasks, holidays, events, classes, onOpenDay }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const weekStartsOn = useStore(s => s.settings?.weekStartsOn ?? 1)
  const forecast = useWeatherForecast()
  const weatherByDate = forecast ? new Map(forecast.map(d => [d.date, d])) : null

  const monthStart = startOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn })
  const days = eachDayOfInterval({ start: gridStart, end: new Date(Math.min(
    endOfMonth(month).getTime(),
    new Date(gridStart.getTime() + 41 * 24 * 60 * 60 * 1000).getTime()
  )) })
  while (days.length < 42) days.push(new Date(days[days.length - 1].getTime() + 86400000))
  const weekCount = days.slice(35).some(d => isSameMonth(d, month)) ? 6 : 5
  const visibleDays = days.slice(0, weekCount * 7)

  const dowOffset = (weekStartsOn + 6) % 7
  const DOW = [...t.weekdaysShort.slice(dowOffset), ...t.weekdaysShort.slice(0, dowOffset)]

  return (
    <div className="flex-1 min-h-0 overflow-auto flex flex-col">
      <div className="grid grid-cols-7 shrink-0">
        {DOW.map(d => (
          <div key={d} className="text-[9px] text-muted-foreground text-center py-1.5 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 min-h-0" style={{ gridAutoRows: '1fr' }}>
        {visibleDays.map(day => (
          <DayCell key={day.toISOString()} day={day} isCurrentMonth={isSameMonth(day, month)}
            tasks={tasks} holidays={holidays} events={events} classes={classes} onOpen={onOpenDay}
            weatherByDate={weatherByDate} />
        ))}
      </div>
    </div>
  )
}
