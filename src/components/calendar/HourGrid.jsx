import { useEffect, useRef, useState } from 'react'
import { format, isSameDay, isWithinInterval, parseISO } from 'date-fns'
import { layoutDayEvents, minutesToTime, MINUTES_PER_DAY } from '@/lib/calendar/eventLayout'
import { useStore } from '@/store/useStore'
import { readableTextColor } from '@/lib/calendar/contrast'
import { useWeatherForecast } from '@/hooks/useWeatherForecast'
import { WeatherIcon } from './WeatherIcon'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 48
const DAY_HEIGHT = HOUR_HEIGHT * 24
const SNAP_MINUTES = 15
const MIN_DURATION_MINUTES = 30
const DEFAULT_COLOR = '#6366f1'
const BLOCK_GUTTER = 2
const BLOCK_GUTTER_WIDE = 14
const DRAG_STRIP_WIDTH = 8

function allDayItemsForDay(day, tasks, holidays) {
  const dayHolidays = holidays.filter(h => isWithinInterval(day, { start: parseISO(h.startDate), end: parseISO(h.endDate) }))
  const dayTasks = tasks.filter(tk => !isGridTask(tk) && isWithinInterval(day, tk._range))
  return { dayHolidays, dayTasks }
}

function isGridTask(task) {
  return Boolean(task?.dueDate)
}

function gridTaskEntries(tasks, classes) {
  return tasks
    .filter(isGridTask)
    .map(tk => ({
      ...tk,
      color: tk.color ?? classes.find(c => c.id === tk.classId)?.color ?? DEFAULT_COLOR,
      _isTask: true,
    }))
}

function AllDayStrip({ day, tasks, holidays, classes }) {
  const { dayHolidays, dayTasks } = allDayItemsForDay(day, tasks, holidays)
  const chips = [
    ...dayHolidays.map(h => ({ key: 'h' + h.id, color: '#d97706', label: h.name })),
    ...dayTasks.map(tk => {
      const cls = classes.find(c => c.id === tk.classId)
      return { key: 't' + tk.id, color: cls?.color ?? DEFAULT_COLOR, label: cls ? `${tk.title} - ${cls.name}` : tk.title }
    }),
  ]
  if (!chips.length) return <div className="min-h-[4px]" />
  return (
    <div className="flex flex-col gap-0.5 p-1">
      {chips.map(c => (
        <div key={c.key} onClick={c.onClick} title={c.label}
          className="text-[10px] leading-tight px-1 rounded truncate cursor-pointer"
          style={{ backgroundColor: c.color + '33', color: c.color }}>
          {c.label}
        </div>
      ))}
    </div>
  )
}

function EventBlock({ segment, onOpenEvent, gutter = BLOCK_GUTTER }) {
  const { event, startMinutes, endMinutes, column, columnCount, continuesBefore, continuesAfter, allDay } = segment
  const color = event.color ?? DEFAULT_COLOR
  const width = 100 / columnCount
  const blockHeight = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT
  const showNote = Boolean(event.note) && blockHeight >= 34
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const textColor = readableTextColor(color, { background: isDark ? '#1a1a1a' : '#ffffff' })

  return (
    <div
      onPointerDown={e => e.stopPropagation()}
      onClick={() => onOpenEvent?.(event)}
      title={event.title}
      className="absolute overflow-hidden pl-1.5 pr-1 py-0.5 text-[10px] leading-tight cursor-pointer"
      style={{
        top: (startMinutes / 60) * HOUR_HEIGHT,
        height: Math.max(18, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT),
        ...(allDay ? { backgroundImage: `repeating-linear-gradient(45deg, ${color}14 0 6px, transparent 6px 12px)` } : null),
        left: `calc(${column * width}% + ${gutter}px)`,
        width: `calc(${width}% - ${gutter * 2}px - ${DRAG_STRIP_WIDTH}px)`,
        backgroundColor: color + '26',
        color: textColor,
        borderLeft: `3px solid ${color}`,
        borderTopLeftRadius: continuesBefore ? 0 : 3,
        borderTopRightRadius: continuesBefore ? 0 : 3,
        borderBottomLeftRadius: continuesAfter ? 0 : 3,
        borderBottomRightRadius: continuesAfter ? 0 : 3,
      }}>
      <span className="font-medium sticky top-0 block truncate">{event.title}</span>
      {showNote && (
        <span className="block truncate opacity-70">{event.note}</span>
      )}
    </div>
  )
}

function snapRange(startMinutes, endMinutes) {
  const low = Math.min(startMinutes, endMinutes)
  const high = Math.max(startMinutes, endMinutes)
  const start = Math.floor(low / SNAP_MINUTES) * SNAP_MINUTES
  let end = Math.ceil(high / SNAP_MINUTES) * SNAP_MINUTES
  if (end - start < MIN_DURATION_MINUTES) end = start + MIN_DURATION_MINUTES
  return { start, end: Math.min(end, MINUTES_PER_DAY) }
}

function useMinuteTick() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function HourGrid({ days, tasks, holidays, events, classes, onOpenEvent, onOpenTask, onCreateRange }) {
  const now = useMinuteTick()
  const nowColor = useStore(s => s.settings?.calendarNowColor ?? '#ef4444')
  const forecast = useWeatherForecast()
  const weatherByDate = forecast ? new Map(forecast.map(d => [d.date, d])) : null
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const gridTasks = gridTaskEntries(tasks, classes)
  const showHeader = days.length > 1
  const blockGutter = days.length === 1 ? BLOCK_GUTTER_WIDE : BLOCK_GUTTER
  const columnsRef = useRef(null)
  const scrollRef = useRef(null)
  const [drag, setDrag] = useState(null)

  const rangeKey = days.length ? `${days[0].toDateString()}|${days[days.length - 1].toDateString()}` : ''
  const todayIndex = days.findIndex(d => isSameDay(d, new Date()))
  const hasToday = todayIndex !== -1

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const current = new Date()
    const minutes = hasToday ? current.getHours() * 60 + current.getMinutes() : 8 * 60
    const target = (minutes / 60) * HOUR_HEIGHT - node.clientHeight / 2
    node.scrollTop = Math.max(0, Math.min(target, node.scrollHeight - node.clientHeight))
  }, [rangeKey, hasToday])

  const pointToPosition = (clientX, clientY) => {
    const container = columnsRef.current
    if (!container) return null
    const columns = [...container.children]
    const rect = container.getBoundingClientRect()
    const x = Math.max(rect.left, Math.min(rect.right - 1, clientX))
    const index = columns.findIndex(col => {
      const box = col.getBoundingClientRect()
      return x >= box.left && x < box.right
    })
    const dayIndex = index === -1 ? 0 : index
    const box = columns[dayIndex].getBoundingClientRect()
    const offsetY = Math.max(0, Math.min(box.height, clientY - box.top))
    return { dayIndex, minutes: (offsetY / DAY_HEIGHT) * MINUTES_PER_DAY }
  }

  const handlePointerDown = e => {
    if (e.pointerType === 'touch') return
    if (e.button != null && e.button !== 0) return
    const position = pointToPosition(e.clientX, e.clientY)
    if (!position) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ from: position, to: position })
  }

  const handlePointerMove = e => {
    if (!drag) return
    const position = pointToPosition(e.clientX, e.clientY)
    if (position) setDrag(d => (d ? { ...d, to: position } : d))
  }

  const handlePointerUp = e => {
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    if (!drag) return
    const { from, to } = drag
    setDrag(null)

    const startIndex = Math.min(from.dayIndex, to.dayIndex)
    const endIndex = Math.max(from.dayIndex, to.dayIndex)

    if (startIndex === endIndex) {
      const { start, end } = snapRange(from.minutes, to.minutes)
      onCreateRange?.(days[startIndex], minutesToTime(start), minutesToTime(end))
      return
    }

    const forward = to.dayIndex >= from.dayIndex
    const startMinutes = Math.floor((forward ? from.minutes : to.minutes) / SNAP_MINUTES) * SNAP_MINUTES
    const endMinutes = Math.ceil((forward ? to.minutes : from.minutes) / SNAP_MINUTES) * SNAP_MINUTES
    onCreateRange?.(
      days[startIndex],
      minutesToTime(startMinutes),
      minutesToTime(endMinutes),
      days[endIndex],
    )
  }

  const cancelDrag = e => {
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    setDrag(null)
  }

  const previewFor = dayIndex => {
    if (!drag) return null
    const startIndex = Math.min(drag.from.dayIndex, drag.to.dayIndex)
    const endIndex = Math.max(drag.from.dayIndex, drag.to.dayIndex)
    if (dayIndex < startIndex || dayIndex > endIndex) return null

    if (startIndex === endIndex) return snapRange(drag.from.minutes, drag.to.minutes)

    const forward = drag.to.dayIndex >= drag.from.dayIndex
    const first = forward ? drag.from.minutes : drag.to.minutes
    const last = forward ? drag.to.minutes : drag.from.minutes
    if (dayIndex === startIndex) return { start: first, end: MINUTES_PER_DAY }
    if (dayIndex === endIndex) return { start: 0, end: last }
    return { start: 0, end: MINUTES_PER_DAY }
  }

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto" data-swipe-ignore>
      <div className="flex border-b border-border/40 sticky top-0 bg-background z-10">
        <div className="w-12 shrink-0" />
        {days.map(day => {
          const isToday = isSameDay(day, new Date())
          const weather = weatherByDate?.get(format(day, 'yyyy-MM-dd'))
          return (
            <div key={day.toISOString()} className="flex-1 min-w-0">
              {showHeader && (
                <div className="flex flex-col items-center gap-0.5 py-1.5">
                  <span className={`text-[9px] uppercase tracking-wide ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {format(day, 'EEE')}
                  </span>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </span>
                  {weather && <WeatherIcon code={weather.code} className={`h-3 w-3 ${isToday ? 'text-primary' : 'text-foreground'}`} />}
                </div>
              )}
              <AllDayStrip day={day} tasks={tasks} holidays={holidays} classes={classes} />
            </div>
          )
        })}
      </div>
      <div className="flex">
        <div className="w-12 shrink-0" data-swipe-allow>
          {HOURS.map(h => (
            <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
              {h > 0 && (
                <span className="absolute right-1.5 -top-1.5 text-[10px] text-muted-foreground tabular-nums">
                  {String(h).padStart(2, '0')}:00
                </span>
              )}
            </div>
          ))}
        </div>
        <div ref={columnsRef} className="flex flex-1"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={cancelDrag}>
          {days.map((day, dayIndex) => {
            const preview = previewFor(dayIndex)
            return (
              <div key={day.toISOString()} className="relative flex-1 select-none"
                style={{ height: DAY_HEIGHT }}>
                {HOURS.map(h => (
                  <div key={h} className="absolute inset-x-0 border-t border-border/25"
                    style={{ top: h * HOUR_HEIGHT }} />
                ))}
                {layoutDayEvents([...events, ...gridTasks], day, { includeAllDay: true }).map(segment => (
                  <EventBlock key={segment.event.id} segment={segment} gutter={blockGutter}
                    onOpenEvent={segment.event._isTask ? onOpenTask : onOpenEvent} />
                ))}
                {isSameDay(day, now) && (
                  <div className="absolute inset-x-0 z-[5] pointer-events-none"
                    style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}>
                    <div className="relative h-px" style={{ backgroundColor: nowColor }}>
                      <span className="absolute -left-1 -top-[3px] h-[7px] w-[7px] rounded-full"
                        style={{ backgroundColor: nowColor }} />
                    </div>
                  </div>
                )}
                {preview && (
                  <div className="absolute left-0.5 right-0.5 rounded bg-primary/20 border border-primary/40 pointer-events-none"
                    style={{
                      top: (preview.start / 60) * HOUR_HEIGHT,
                      height: Math.max(4, ((preview.end - preview.start) / 60) * HOUR_HEIGHT),
                    }} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
