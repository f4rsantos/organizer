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
import { SwipePager } from './SwipePager'
import { useMergedTasks } from '@/hooks/useMergedTasks'
import { useMergedEvents } from '@/hooks/useMergedEvents'
import { CalendarEventProviders } from '@/apps/CalendarEventProviders'
import { EventForm } from './EventForm'
import { DayDetailDialog } from './DayDetailDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TaskForm } from '@/components/tasks/TaskForm'
import { ShareToTeamDialog } from '@/components/collab/ShareToTeamDialog'
import { useCollabActions } from '@/hooks/useCollabActions'
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
  const weekCtx = useWeekContext()
  const { mode, semester } = weekCtx
  const noneMode = mode === 'none'
  const storeActiveSemesterId = useStore(s => s.activeSemesterId)
  const activeSemesterId = noneMode ? null : storeActiveSemesterId
  const allClasses = useStore(s => s.classes)
  const allTasks = useMergedTasks(activeSemesterId)
  const allHolidays = useStore(s => s.holidays)
  const allEvents = useMergedEvents()
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
  const weekStartsOn = useStore(s => s.settings?.weekStartsOn ?? 1)

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
  const [taskEdit, setTaskEdit] = useState(null)
  const updateTask = useStore(s => s.updateTask)
  const { updateSharedTask, teams, shareEventToTeam } = useCollabActions()
  const [shareEvent, setShareEvent] = useState(null)
  const [shareTeamId, setShareTeamId] = useState('')

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

  const shiftAnchor = (base, step) => {
    if (step === 0) return base
    if (view === 'day') return addDays(base, step)
    if (view === 'week') return addDays(base, step * 7)
    if (view === 'year') return new Date(base.getFullYear() + step, base.getMonth(), base.getDate())
    return addMonths(base, step)
  }

  const detail = dayDetail ? itemsForDay(dayDetail, tasks, holidays, events) : null

  // EventForm reads props once at mount, so each open needs a distinct key.
  const openNewEvent =(date, startTime = null, endTime = null, endDate = null) => {
    setDayDetail(null)
    setEventForm({ key: `new:${nanoid()}`, event: null, defaultDate: date, defaultStartTime: startTime, defaultEndTime: endTime, defaultEndDate: endDate })
  }
  const openEditTask = task => {
    const target = task.isRecurringOccurrence
      ? allTasks.find(tk => tk.id === task.templateId) ?? task
      : task
    setDayDetail(null)
    setTaskEdit(target)
  }

  const submitTaskEdit = async data => {
    if (!taskEdit) return
    const shared = taskEdit.sharedMeta
    if (shared?.remote) {
      await updateSharedTask({ teamId: shared.teamId, sharedTaskId: shared.sharedTaskId, patch: data })
      return
    }
    updateTask(taskEdit.isRecurringOccurrence ? taskEdit.templateId : taskEdit.id, data)
  }

  const openShareEvent = async event => {
    if (!teams.length) return
    if (teams.length === 1) {
      setDayDetail(null)
      await shareEventToTeam({ event, teamId: teams[0].teamId })
      return
    }
    setDayDetail(null)
    setShareEvent(event)
  }

  const confirmShareEvent = async () => {
    if (!shareTeamId || !shareEvent) return
    await shareEventToTeam({ event: shareEvent, teamId: shareTeamId })
    setShareEvent(null)
    setShareTeamId('')
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
      const ws = startOfWeek(anchor, { weekStartsOn })
      const we = endOfWeek(anchor, { weekStartsOn })
      return `${format(ws, 'd MMM')} – ${format(we, 'd MMM yyyy')}`
    }
    if (view === 'year') return String(anchor.getFullYear())
    return `${t.months[anchor.getMonth()]} ${anchor.getFullYear()}`
  }

  return (
    <div className="flex flex-col h-tab-pane select-none relative">
      <CalendarEventProviders onEvents={handleWidgetProviderEvents} />
      <div className="flex items-center gap-1 px-4 pt-3 pb-2 shrink-0">
        <p className="flex-1 text-xl font-semibold capitalize truncate tracking-tight">{headerLabel()}</p>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={goPrev} disabled={!canPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={goNext} disabled={!canNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-center px-4 pb-2 shrink-0">
        <div className="relative grid grid-cols-4 w-full max-w-xs rounded-full bg-muted/60 p-0.5">
          <div
            className="absolute inset-y-0.5 rounded-full bg-background shadow-sm transition-[left] duration-200 ease-out"
            style={{ width: `calc(25% - 4px)`, left: `calc(${VIEWS.indexOf(view)} * 25% + 2px)` }}
          />
          {VIEWS.map(v => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={`relative z-10 flex items-center justify-center min-w-0 text-xs px-2.5 py-1.5 rounded-full transition-colors ${view === v ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
              {{ day: t.viewDay, week: t.viewWeek, month: t.viewMonth, year: t.viewYear }[v]}
            </button>
          ))}
        </div>
      </div>

      <SwipePager
        pageKey={`${view}:${format(anchor, 'yyyy-MM-dd')}`}
        canPrev={canPrev} canNext={canNext}
        onPrev={goPrev} onNext={goNext}
        renderPage={step => {
          const pageAnchor = shiftAnchor(anchor, step)
          if (view === 'month') return (
            <MonthView month={pageAnchor} tasks={tasks} holidays={holidays} events={events} classes={classes} onOpenDay={setDayDetail} />
          )
          if (view === 'day') return (
            <DayView day={pageAnchor} tasks={tasks} holidays={holidays} events={events} classes={classes}
              onOpenEvent={openEditEvent} onOpenTask={openEditTask} onCreateRange={(day, startTime, endTime, endDay) =>
                openNewEvent(format(day, 'yyyy-MM-dd'), startTime, endTime, endDay ? format(endDay, 'yyyy-MM-dd') : null)} />
          )
          if (view === 'week') return (
            <WeekView weekStart={startOfWeek(pageAnchor, { weekStartsOn })} weekEnd={endOfWeek(pageAnchor, { weekStartsOn })}
              tasks={tasks} holidays={holidays} events={events} classes={classes}
              onOpenEvent={openEditEvent} onOpenTask={openEditTask} onCreateRange={(day, startTime, endTime, endDay) =>
                openNewEvent(format(day, 'yyyy-MM-dd'), startTime, endTime, endDay ? format(endDay, 'yyyy-MM-dd') : null)} />
          )
          return (
            <YearView year={pageAnchor.getFullYear()} tasks={tasks} holidays={holidays} events={events}
              onOpenMonth={openMonth} onOpenDay={openDay} />
          )
        }}
      />

      {hasScope && (
        <Button size="icon" className="absolute bottom-6 right-6 z-20 h-12 w-12 rounded-full shadow-lg" onClick={() => openNewEvent(format(new Date(), 'yyyy-MM-dd'))}>
          <Plus className="h-5 w-5" />
        </Button>
      )}

      <DayDetailDialog open={Boolean(dayDetail)} onOpenChange={v => !v && setDayDetail(null)}
        day={dayDetail} holidays={detail?.dayHolidays ?? []} events={detail?.dayEvents ?? []}
        tasks={detail?.dayTasks ?? []} classes={classes}
        onAddEvent={() => openNewEvent(dayDetail ? format(dayDetail, 'yyyy-MM-dd') : null)}
        onEditEvent={openEditEvent} onEditTask={openEditTask}
        onShareEvent={openShareEvent} canShare={teams.length > 0} />

      <ShareToTeamDialog
        open={Boolean(shareEvent)}
        onOpenChange={v => { if (!v) { setShareEvent(null); setShareTeamId('') } }}
        title={t.collabShareEvent}
        teams={teams}
        value={shareTeamId}
        onValueChange={setShareTeamId}
        onConfirm={confirmShareEvent}
      />

      <Dialog open={Boolean(taskEdit)} onOpenChange={v => !v && setTaskEdit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.editTask}</DialogTitle>
          </DialogHeader>
          {taskEdit && (
            <TaskForm
              semesterId={taskEdit.semesterId ?? activeSemesterId}
              classes={classes}
              weekCount={weekCtx.weekCount}
              defaultWeek={taskEdit.weekStart ?? 1}
              startDate={noneMode ? null : (semester?.startDate ?? null)}
              rangeFor={noneMode ? weekCtx.weekDateRange : null}
              dateToWeekFn={noneMode ? weekCtx.dateToWeek : null}
              initialData={taskEdit}
              submitLabel={t.save}
              onSubmitTask={submitTaskEdit}
              onDone={() => setTaskEdit(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {eventForm && (
        <EventForm key={eventForm.key} open onOpenChange={v => !v && setEventForm(null)}
          event={eventForm.event} semesterId={activeSemesterId} defaultDate={eventForm.defaultDate}
          defaultStartTime={eventForm.defaultStartTime} defaultEndTime={eventForm.defaultEndTime}
          defaultEndDate={eventForm.defaultEndDate} />
      )}
    </div>
  )
}
