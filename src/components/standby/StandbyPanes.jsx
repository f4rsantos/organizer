import { useEffect, useRef, useState } from 'react'
import { format, startOfMonth, startOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO, isWithinInterval } from 'date-fns'
import { SvgProgressWheel } from '@/components/common/SvgProgressWheel'
import { AnalogClock } from '@/components/common/AnalogClock'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { useWeekContext } from '@/hooks/useWeekContext'
import { useMergedTasks } from '@/hooks/useMergedTasks'
import { useMergedKanbanBoard } from '@/hooks/useMergedKanbanBoard'
import { completionRatio, groupTasksByClass, getTasksForWeek } from '@/lib/taskUtils'
import { FocusTab } from '@/components/focus/FocusTab'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'

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
  return (
    <div className="h-full w-full flex-1 self-stretch overflow-hidden">
      <FocusTab />
    </div>
  )
}

function TasksByCategoryPane() {
  const scopeId = useScope()
  const classes = useStore(s => s.classes).filter(c => c.semesterId === scopeId)
  const toggleTask = useStore(s => s.toggleTask)
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
              <li key={t.id}>
                <button onClick={() => toggleTask(t.id)}
                  className={`w-full text-left text-xs truncate cursor-pointer hover:text-foreground transition-colors ${t.done ? 'line-through text-muted-foreground' : ''}`}>
                  {t.title}
                </button>
              </li>
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
  return (
    <div className="w-full h-full overflow-auto px-1">
      <KanbanBoard semId={scopeId} board={board} localBoard={board} vertical />
    </div>
  )
}

function CalendarPane() {
  const scopeId = useScope()
  const t = useStrings(useStore(s => s.lang ?? 'en'))
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
  const dow = t.weekdaysShort.map(d => d[0])

  const todayStr = format(now, 'yyyy-MM-dd')
  const upcomingEvents = events
    .filter(e => (e.date ?? e.startDate) && (e.date ?? e.endDate ?? e.startDate) >= todayStr)
    .sort((a, b) => (a.date ?? a.startDate).localeCompare(b.date ?? b.startDate))
    .slice(0, 5)

  return (
    <div className="w-full flex flex-col items-center gap-3 px-2">
      <div className="text-2xl font-semibold tabular-nums">{format(now, 'HH:mm')}</div>
      <div className="text-sm font-medium capitalize">{t.months[now.getMonth()]} {now.getFullYear()}</div>
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

export function StandbyPanePager({ panes }) {
  const [index, setIndex] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(null)
  const widthRef = useRef(1)
  const count = panes.length

  const onPointerDown = e => {
    startX.current = e.clientX
    widthRef.current = e.currentTarget.offsetWidth || 1
    setDragging(true)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = e => {
    if (startX.current === null) return
    setDragX(e.clientX - startX.current)
  }
  const onPointerUp = () => {
    if (startX.current === null) return
    const threshold = widthRef.current * 0.2
    if (dragX < -threshold && index < count - 1) setIndex(index + 1)
    else if (dragX > threshold && index > 0) setIndex(index - 1)
    startX.current = null
    setDragX(0)
    setDragging(false)
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <div className="relative flex-1 touch-pan-y overflow-hidden"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <div className="flex h-full transition-transform"
          style={{
            width: `${count * 100}%`,
            transform: `translateX(calc(${-index * (100 / count)}% + ${dragX}px))`,
            transitionDuration: dragging ? '0ms' : '250ms',
          }}>
          {panes.map((pane, i) => (
            <div key={i} className="flex h-full items-center justify-center overflow-hidden px-1"
              style={{ width: `${100 / count}%` }}>
              <StandbyPane pane={pane} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-center gap-1.5 py-1.5">
        {panes.map((_, i) => (
          <button key={i} onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-primary' : 'w-1.5 bg-border'}`} />
        ))}
      </div>
    </div>
  )
}
