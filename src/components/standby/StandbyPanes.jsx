import { useEffect, useRef, useState } from 'react'
import { format, startOfMonth, startOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO, isWithinInterval } from 'date-fns'
import { SvgProgressWheel } from '@/components/common/SvgProgressWheel'
import { AnalogClock } from '@/components/common/AnalogClock'
import { useStore } from '@/store/useStore'
import { useWeekContext } from '@/hooks/useWeekContext'
import { useMergedTasks } from '@/hooks/useMergedTasks'
import { useMergedKanbanBoard } from '@/hooks/useMergedKanbanBoard'
import { completionRatio, groupTasksByClass, getTasksForWeek } from '@/lib/taskUtils'
import { useFocusClock } from '@/components/focus/useFocusClock'
import { fmtTimer } from '@/components/focus/focusTab/formatters'
import { PomodoroLayer } from '@/components/focus/PomodoroLayer'

function useScope() {
  const noneMode = useStore(s => s.settings?.semesterMode === 'none')
  const activeSemesterId = useStore(s => s.activeSemesterId)
  return noneMode ? null : activeSemesterId
}

function useScopedWeekTasks() {
  const scopeId = useScope()
  const { currentWeek } = useWeekContext()
  const tasks = useMergedTasks(scopeId)
  return getTasksForWeek(tasks.filter(t => t.views?.list !== false), currentWeek)
}

function WheelPane({ withTime }) {
  const weekTasks = useScopedWeekTasks()
  const pct = completionRatio(weekTasks)
  return (
    <div className="flex flex-col items-center gap-4">
      <SvgProgressWheel pct={pct} size={180} label={`${Math.round(pct * 100)}%`}
        center={withTime ? <AnalogClock size={120} /> : undefined} />
    </div>
  )
}

function FocusPane() {
  const focus = useStore(s => s.settings?.focus ?? {})
  const pomodoroEnabled = useStore(s => s.settings?.pomodoro?.enabled ?? false)
  const containerRef = useRef(null)
  const [resetSignal, setResetSignal] = useState(null)
  const clock = useFocusClock({
    useInterval: focus.useInterval ?? true,
    intervalMins: focus.intervalMins ?? 25,
    intervalBreakMins: focus.intervalBreakMins ?? 5,
    useScheduled: focus.useScheduled ?? false,
    scheduledBreakMins: focus.scheduledBreakMins ?? 5,
    scheduledTimes: focus.scheduledTimes ?? [],
    intervalResetMode: focus.intervalResetMode ?? 'reset',
  })
  const onBreak = clock.phase === 'break'
  const intervalSecs = (focus.intervalMins ?? 25) * 60
  const pct = onBreak
    ? (clock.breakSecsLeft / Math.max(1, (clock.activeBreakSource === 'interval' ? (focus.intervalBreakMins ?? 5) : (focus.scheduledBreakMins ?? 5)) * 60))
    : (focus.useInterval ? Math.min(1, clock.cycleElapsed / intervalSecs) : 0)
  const time = onBreak ? fmtTimer(clock.breakSecsLeft) : fmtTimer(clock.totalElapsed)

  const handleReset = () => {
    setResetSignal({ ts: Date.now(), phase: clock.phase, cycleElapsed: clock.cycleElapsed })
    clock.reset()
  }

  return (
    <div ref={containerRef} className="relative flex h-full w-full flex-1 self-stretch flex-col items-center justify-center gap-4 overflow-hidden">
      {pomodoroEnabled && (
        <PomodoroLayer containerRef={containerRef} focusRunning={clock.running}
          phase={clock.phase} cycleElapsed={clock.cycleElapsed} resetSignal={resetSignal} />
      )}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <SvgProgressWheel pct={pct} size={160} label={time} />
        <div className="text-sm text-muted-foreground">
          {onBreak ? (focus.breakLabel || 'Break') : (focus.focusLabel || 'Focus')}
          {!clock.running && ' · paused'}
        </div>
        <div className="flex items-center gap-2">
          {onBreak
            ? <StandbyBtn onClick={clock.skipBreak}>⏭</StandbyBtn>
            : clock.running
              ? <StandbyBtn onClick={clock.pause}>⏸</StandbyBtn>
              : <StandbyBtn onClick={clock.totalElapsed > 0 ? clock.resume : clock.start}>▶</StandbyBtn>}
          <StandbyBtn onClick={handleReset}>⟲</StandbyBtn>
        </div>
      </div>
    </div>
  )
}

function StandbyBtn({ onClick, children }) {
  return (
    <button onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-lg hover:bg-secondary transition-colors">
      {children}
    </button>
  )
}

function TasksByCategoryPane() {
  const scopeId = useScope()
  const classes = useStore(s => s.classes).filter(c => c.semesterId === scopeId)
  const weekTasks = useScopedWeekTasks()
  const groups = groupTasksByClass(weekTasks, classes)
  return (
    <div className="w-full space-y-3 overflow-y-auto max-h-full px-2">
      {groups.map(({ cls, tasks }) => (
        <div key={cls.id}>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cls.color }} />
            <span className="text-sm font-medium truncate">{cls.name}</span>
            <span className="text-xs text-muted-foreground">{tasks.filter(t => t.done).length}/{tasks.length}</span>
          </div>
          <ul className="space-y-0.5 pl-4">
            {tasks.slice(0, 5).map(t => (
              <li key={t.id} className={`text-xs truncate ${t.done ? 'line-through text-muted-foreground' : ''}`}>{t.title}</li>
            ))}
          </ul>
        </div>
      ))}
      {!groups.length && <p className="text-sm text-muted-foreground text-center">—</p>}
    </div>
  )
}

function KanbanPane() {
  const scopeId = useScope()
  const board = useMergedKanbanBoard(scopeId)
  const columns = [...(board?.columns ?? [])].sort((a, b) => a.order - b.order)
  return (
    <div className="flex flex-col gap-2 w-full h-full overflow-y-auto px-2">
      {columns.map(col => {
        const cards = (board.cards ?? []).filter(c => c.columnId === col.id)
        return (
          <div key={col.id} className="rounded-lg bg-secondary/40 p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold truncate">{col.title}</span>
              <span className="text-xs text-muted-foreground">{cards.length}</span>
            </div>
            <ul className="space-y-1">
              {cards.slice(0, 6).map(c => (
                <li key={c.id} className="text-[11px] rounded bg-background px-1.5 py-1 truncate">{c.title}</li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function CalendarPane() {
  const scopeId = useScope()
  const events = useStore(s => s.events ?? []).filter(e => e.semesterId === scopeId || e.semesterId == null)
  const weekTasks = useScopedWeekTasks()
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const monthStart = startOfMonth(now)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: new Date(gridStart.getTime() + 41 * 86400000) }).slice(0, 42)
  const taskDates = new Set(weekTasks.filter(t => t.dueDate).map(t => t.dueDate))
  const eventsOnDay = day => {
    const ds = format(day, 'yyyy-MM-dd')
    return events.filter(e => {
      if (e.date) return e.date === ds
      if (e.startDate) return isWithinInterval(day, { start: parseISO(e.startDate), end: parseISO(e.endDate ?? e.startDate) })
      return false
    })
  }
  const dow = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  const todayStr = format(now, 'yyyy-MM-dd')
  const upcomingEvents = events
    .filter(e => (e.date ?? e.startDate) && (e.date ?? e.endDate ?? e.startDate) >= todayStr)
    .sort((a, b) => (a.date ?? a.startDate).localeCompare(b.date ?? b.startDate))
    .slice(0, 5)

  return (
    <div className="w-full flex flex-col items-center gap-3 px-2">
      <div className="text-2xl font-semibold tabular-nums">{format(now, 'HH:mm')}</div>
      <div className="text-sm font-medium capitalize">{format(now, 'MMMM yyyy')}</div>
      <div className="grid grid-cols-7 gap-0.5 text-center w-full max-w-xs">
        {dow.map((d, i) => <div key={i} className="text-[10px] text-muted-foreground py-0.5">{d}</div>)}
        {days.map(day => {
          const cur = isSameMonth(day, now)
          const today = isSameDay(day, now)
          const dayEvents = eventsOnDay(day)
          const hasTask = taskDates.has(format(day, 'yyyy-MM-dd'))
          return (
            <div key={day.toISOString()}
              className={`relative text-[11px] pt-1 pb-2.5 rounded ${cur ? '' : 'opacity-30'} ${today ? 'bg-primary text-primary-foreground font-semibold' : ''}`}>
              {format(day, 'd')}
              {cur && (dayEvents.length > 0 || hasTask) && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {hasTask && <span className="h-1 w-1 rounded-full bg-primary" />}
                  {dayEvents.slice(0, 3).map(e => (
                    <span key={e.id} className="h-1 w-1 rounded-full" style={{ backgroundColor: e.color ?? '#6366f1' }} />
                  ))}
                </span>
              )}
            </div>
          )
        })}
      </div>
      {upcomingEvents.length > 0 && (
        <div className="w-full max-w-xs space-y-1 overflow-y-auto">
          {upcomingEvents.map(e => (
            <div key={e.id} className="flex items-center gap-2 text-xs rounded px-2 py-1"
              style={{ backgroundColor: (e.color ?? '#6366f1') + '22', color: e.color ?? '#6366f1' }}>
              <span className="tabular-nums shrink-0">{format(parseISO(e.date ?? e.startDate), 'd MMM')}</span>
              <span className="truncate">{e.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function StandbyPane({ pane }) {
  switch (pane) {
    case 'wheel': return <WheelPane withTime={false} />
    case 'wheel-time': return <WheelPane withTime />
    case 'calendar': return <CalendarPane />
    case 'focus': return <FocusPane />
    case 'kanban': return <KanbanPane />
    case 'tasks-by-category': return <TasksByCategoryPane />
    default: return null
  }
}
