import { useState, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import {
  addWeeks, startOfWeek, endOfWeek, parseISO, format, startOfMonth,
  addMonths, subMonths, addDays, subDays, setISOWeek, startOfISOWeek,
} from 'date-fns'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { useWeekContext } from '@/hooks/useWeekContext'
import { useMergedTasks } from '@/hooks/useMergedTasks'
import { CalendarEventProviders } from '@/apps/CalendarEventProviders'
import { EventForm } from './EventForm'
import { DayDetailDialog } from './DayDetailDialog'
import { MonthView } from './MonthView'
import { itemsForDay } from './calendarUtils'
import { DayView } from './DayView'
import { WeekView } from './WeekView'
import { YearView } from './YearView'
import { expandTasksForRange, expandEventsForRange } from '@/lib/recurrence'
import { setProviderEvents } from '@/lib/widgets/extraEvents'
import { nanoid } from '@/lib/ids'

const VIEWS = ['day', 'week', 'month', 'year']

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
  const handleWidgetProviderEvents = useCallback((id, events) => {
    handleProviderEvents(id, events)
    setProviderEvents(id, events)
  }, [handleProviderEvents])
  const providerEvents = useMemo(() => Object.values(pluginEvents).flat(), [pluginEvents])
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const hasScope = Boolean(semester) || noneMode
  const semStart = semester ? parseISO(semester.startDate) : null
  const semEnd = semester ? parseISO(semester.endDate) : null
  const year = new Date().getFullYear()

  const [view, setView] = useState('month')
  const [anchor, setAnchor] = useState(() => {
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
  const expandRangeStart = new Date(anchor.getFullYear() - 1, 0, 1)
  const expandRangeEnd = new Date(anchor.getFullYear() + 1, 11, 31)
  const events = hasScope
    ? [
        ...expandEventsForRange(
          allEvents.filter(e => e.semesterId === activeSemesterId || e.semesterId == null),
          expandRangeStart, expandRangeEnd,
        ),
        ...providerEvents,
      ].map(e => ({ ...e, _range: eventDateRange(e) }))
    : []
  const tasks = hasScope
    ? expandTasksForRange(
        allTasks.filter(tk => tk.views?.calendar !== false),
        expandRangeStart, expandRangeEnd,
      ).map(tk => ({
        ...tk,
        _range: tk.isRecurringOccurrence
          ? { start: parseISO(tk.dueDate), end: parseISO(tk.dueDate) }
          : getTaskDateRange(tk, semester?.startDate, noneMode, year),
      }))
    : []

  const clampMonth = m => {
    if (semStart && startOfMonth(m) < startOfMonth(semStart)) return startOfMonth(semStart)
    if (semEnd && startOfMonth(m) > startOfMonth(semEnd)) return startOfMonth(semEnd)
    return m
  }

  const goPrev = () => setAnchor(a => {
    if (view === 'day') return subDays(a, 1)
    if (view === 'week') return subDays(a, 7)
    if (view === 'year') return new Date(a.getFullYear() - 1, a.getMonth(), a.getDate())
    return clampMonth(subMonths(a, 1))
  })
  const goNext = () => setAnchor(a => {
    if (view === 'day') return addDays(a, 1)
    if (view === 'week') return addDays(a, 7)
    if (view === 'year') return new Date(a.getFullYear() + 1, a.getMonth(), a.getDate())
    return clampMonth(addMonths(a, 1))
  })

  const canPrev = view === 'month' ? (!semStart || startOfMonth(anchor) > startOfMonth(semStart)) : true
  const canNext = view === 'month' ? (!semEnd || startOfMonth(anchor) < startOfMonth(semEnd)) : true

  const detail = dayDetail ? itemsForDay(dayDetail, tasks, holidays, events) : null

  // EventForm reads props once at mount, so each open needs a distinct key.
  const openNewEvent =(date, startTime = null, endTime = null, endDate = null) => {
    setDayDetail(null)
    setEventForm({ key: `new:${nanoid()}`, event: null, defaultDate: date, defaultStartTime: startTime, defaultEndTime: endTime, defaultEndDate: endDate })
  }
  const openEditEvent = event => {
    if (event._remote) return
    setDayDetail(null)
    const target = event.isRecurringOccurrence ? allEvents.find(e => e.id === event.templateId) ?? event : event
    setEventForm({ key: target.id, event: target, defaultDate: null })
  }

  const openMonth = date => { setAnchor(date); setView('month') }
  const openDay = date => { setAnchor(date); setView('day') }

  const headerLabel = () => {
    if (view === 'day') return `${t.weekdays[(anchor.getDay() + 6) % 7]}, ${anchor.getDate()} ${t.months[anchor.getMonth()]} ${anchor.getFullYear()}`
    if (view === 'week') {
      const ws = startOfWeek(anchor, { weekStartsOn: 1 })
      const we = endOfWeek(anchor, { weekStartsOn: 1 })
      return `${format(ws, 'd MMM')} – ${format(we, 'd MMM yyyy')}`
    }
    if (view === 'year') return String(anchor.getFullYear())
    return `${t.months[anchor.getMonth()]} ${anchor.getFullYear()}`
  }

  return (
    <div className="flex flex-col h-tab-pane select-none relative">
      <CalendarEventProviders onEvents={handleWidgetProviderEvents} />
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goPrev} disabled={!canPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="flex-1 text-center font-semibold text-sm capitalize truncate">{headerLabel()}</p>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goNext} disabled={!canNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-center px-4 py-1.5 border-b border-border/50 shrink-0">
        <div className="relative grid grid-cols-4 w-full max-w-xs rounded-md bg-accent/30 p-0.5">
          <div
            className="absolute inset-y-0.5 rounded-[5px] bg-secondary transition-[left] duration-200 ease-out"
            style={{ width: `calc(25% - 4px)`, left: `calc(${VIEWS.indexOf(view)} * 25% + 2px)` }}
          />
          {VIEWS.map(v => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={`relative z-10 flex items-center justify-center min-w-0 text-xs px-2.5 py-1 rounded-md transition-colors ${view === v ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
              {{ day: t.viewDay, week: t.viewWeek, month: t.viewMonth, year: t.viewYear }[v]}
            </button>
          ))}
        </div>
      </div>

      {view === 'month' && (
        <MonthView month={anchor} tasks={tasks} holidays={holidays} events={events} classes={classes} onOpenDay={setDayDetail} />
      )}
      {view === 'day' && (
        <DayView day={anchor} tasks={tasks} holidays={holidays} events={events} classes={classes}
          onOpenEvent={openEditEvent} onCreateRange={(day, startTime, endTime, endDay) =>
            openNewEvent(format(day, 'yyyy-MM-dd'), startTime, endTime, endDay ? format(endDay, 'yyyy-MM-dd') : null)} />
      )}
      {view === 'week' && (
        <WeekView weekStart={startOfWeek(anchor, { weekStartsOn: 1 })} weekEnd={endOfWeek(anchor, { weekStartsOn: 1 })}
          tasks={tasks} holidays={holidays} events={events} classes={classes}
          onOpenEvent={openEditEvent} onCreateRange={(day, startTime, endTime, endDay) =>
            openNewEvent(format(day, 'yyyy-MM-dd'), startTime, endTime, endDay ? format(endDay, 'yyyy-MM-dd') : null)} />
      )}
      {view === 'year' && (
        <YearView year={anchor.getFullYear()} tasks={tasks} holidays={holidays} events={events}
          onOpenMonth={openMonth} onOpenDay={openDay} />
      )}

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
        <EventForm key={eventForm.key} open onOpenChange={v => !v && setEventForm(null)}
          event={eventForm.event} semesterId={activeSemesterId} defaultDate={eventForm.defaultDate}
          defaultStartTime={eventForm.defaultStartTime} defaultEndTime={eventForm.defaultEndTime}
          defaultEndDate={eventForm.defaultEndDate} />
      )}
    </div>
  )
}
