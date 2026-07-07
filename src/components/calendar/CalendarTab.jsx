import { useState, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { addWeeks, startOfWeek, parseISO, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, addMonths, subMonths, setISOWeek, startOfISOWeek } from 'date-fns'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { useWeekContext } from '@/hooks/useWeekContext'
import { useMergedTasks } from '@/hooks/useMergedTasks'
import { CalendarEventProviders } from '@/apps/CalendarEventProviders'
import { EventForm } from './EventForm'
import { DayDetailDialog } from './DayDetailDialog'

const MAX_CHIPS = 3

function weekToDateRange(semesterStartDate, weekNumber) {
  const start = parseISO(semesterStartDate)
  const weekStart = addWeeks(startOfWeek(start, { weekStartsOn: 1 }), weekNumber - 1)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  return { start: weekStart, end: weekEnd }
}

function isoWeekToDateRange(weekNumber, year) {
  const weekStart = startOfISOWeek(setISOWeek(new Date(year, 5, 1), weekNumber))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  return { start: weekStart, end: weekEnd }
}

function getTaskDateRange(task, semesterStartDate, noneMode, year) {
  if (task.dueDate) return { start: parseISO(task.dueDate), end: parseISO(task.dueDate) }
  if (noneMode) {
    const s = isoWeekToDateRange(task.weekStart, year)
    const e = isoWeekToDateRange(task.weekEnd, year)
    return { start: s.start, end: e.end }
  }
  const s = weekToDateRange(semesterStartDate, task.weekStart)
  const e = weekToDateRange(semesterStartDate, task.weekEnd)
  return { start: s.start, end: e.end }
}

function eventDateRange(event) {
  if (event.date) return { start: parseISO(event.date), end: parseISO(event.date) }
  if (event.startDate) return { start: parseISO(event.startDate), end: parseISO(event.endDate ?? event.startDate) }
  return null
}

function itemsForDay(day, tasks, holidays, events) {
  const dayHolidays = holidays.filter(h => isWithinInterval(day, { start: parseISO(h.startDate), end: parseISO(h.endDate) }))
  const dayEvents = events.filter(e => e._range && isWithinInterval(day, e._range))
  const dayTasks = tasks.filter(tk => isWithinInterval(day, tk._range))
  return { dayHolidays, dayEvents, dayTasks }
}

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

export function CalendarTab() {
  const { mode, semester } = useWeekContext()
  const noneMode = mode === 'none'
  const storeActiveSemesterId = useStore(s => s.activeSemesterId)
  const activeSemesterId = noneMode ? null : storeActiveSemesterId
  const allClasses = useStore(s => s.classes)
  const allTasks = useMergedTasks(activeSemesterId)
  const allHolidays = useStore(s => s.holidays)
  const allEvents = useStore(s => s.events ?? [])
  const [pluginEvents, setPluginEvents] = useState({})
  const handleProviderEvents = useCallback((id, events) => {
    setPluginEvents(prev => (prev[id] === events ? prev : { ...prev, [id]: events }))
  }, [])
  const providerEvents = useMemo(() => Object.values(pluginEvents).flat(), [pluginEvents])
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const hasScope = Boolean(semester) || noneMode
  const semStart = semester ? parseISO(semester.startDate) : null
  const semEnd = semester ? parseISO(semester.endDate) : null
  const year = new Date().getFullYear()

  const [month, setMonth] = useState(() => {
    const today = new Date()
    if (!semStart || !semEnd) return today
    if (today < semStart) return semStart
    if (today > semEnd) return semEnd
    return today
  })
  const [dayDetail, setDayDetail] = useState(null)
  const [eventForm, setEventForm] = useState(null)

  const classes = hasScope ? allClasses.filter(c => c.semesterId === activeSemesterId) : []
  const holidays = hasScope ? (allHolidays ?? []).filter(h => h.semesterId === activeSemesterId) : []
  const events = hasScope
    ? [...allEvents.filter(e => e.semesterId === activeSemesterId || e.semesterId == null), ...providerEvents]
        .map(e => ({ ...e, _range: eventDateRange(e) }))
    : []
  const tasks = hasScope
    ? allTasks
        .filter(tk => tk.views?.calendar !== false)
        .map(tk => ({ ...tk, _range: getTaskDateRange(tk, semester?.startDate, noneMode, year) }))
    : []

  const clampMonth = m => {
    if (semStart && startOfMonth(m) < startOfMonth(semStart)) return startOfMonth(semStart)
    if (semEnd && startOfMonth(m) > startOfMonth(semEnd)) return startOfMonth(semEnd)
    return m
  }
  const goPrev = () => setMonth(m => clampMonth(subMonths(m, 1)))
  const goNext = () => setMonth(m => clampMonth(addMonths(m, 1)))
  const canPrev = !semStart || startOfMonth(month) > startOfMonth(semStart)
  const canNext = !semEnd || startOfMonth(month) < startOfMonth(semEnd)

  const monthStart = startOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: new Date(Math.min(
    endOfMonth(month).getTime(),
    new Date(gridStart.getTime() + 41 * 24 * 60 * 60 * 1000).getTime()
  )) })
  while (days.length < 42) days.push(new Date(days[days.length - 1].getTime() + 86400000))

  const DOW = lang === 'pt'
    ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const detail = dayDetail ? itemsForDay(dayDetail, tasks, holidays, events) : null

  const openNewEvent = date => { setDayDetail(null); setEventForm({ event: null, defaultDate: date }) }
  const openEditEvent = event => { if (event._remote) return; setDayDetail(null); setEventForm({ event, defaultDate: null }) }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-screen select-none relative">
      <CalendarEventProviders onEvents={handleProviderEvents} />
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goPrev} disabled={!canPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="flex-1 text-center font-semibold text-sm capitalize">{format(month, 'MMMM yyyy')}</p>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goNext} disabled={!canNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 border-t border-l border-border/40">
          {DOW.map(d => (
            <div key={d} className="text-[10px] font-semibold text-muted-foreground text-center py-1.5 border-b border-r border-border/40 uppercase tracking-wide">
              {d}
            </div>
          ))}
          {days.map(day => (
            <DayCell key={day.toISOString()} day={day} isCurrentMonth={isSameMonth(day, month)}
              tasks={tasks} holidays={holidays} events={events} classes={classes} onOpen={setDayDetail} />
          ))}
        </div>
      </div>

      {hasScope && (
        <Button size="icon" className="absolute bottom-6 right-6 h-12 w-12 rounded-full shadow-lg" onClick={() => openNewEvent(format(new Date(), 'yyyy-MM-dd'))}>
          <Plus className="h-5 w-5" />
        </Button>
      )}

      <DayDetailDialog open={Boolean(dayDetail)} onOpenChange={v => !v && setDayDetail(null)}
        day={dayDetail} holidays={detail?.dayHolidays ?? []} events={detail?.dayEvents ?? []}
        tasks={detail?.dayTasks ?? []} classes={classes}
        onAddEvent={() => openNewEvent(dayDetail ? format(dayDetail, 'yyyy-MM-dd') : null)}
        onEditEvent={openEditEvent} />

      {eventForm && (
        <EventForm open onOpenChange={v => !v && setEventForm(null)}
          event={eventForm.event} semesterId={activeSemesterId} defaultDate={eventForm.defaultDate} />
      )}
    </div>
  )
}
