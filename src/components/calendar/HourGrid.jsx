import { useRef, useState } from 'react'
import { format, isSameDay, isWithinInterval, parseISO } from 'date-fns'
import { layoutDayEvents, minutesToTime, MINUTES_PER_DAY } from '@/lib/calendar/eventLayout'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 48
const DAY_HEIGHT = HOUR_HEIGHT * 24
const SNAP_MINUTES = 15
const MIN_DURATION_MINUTES = 30
const DEFAULT_COLOR = '#6366f1'

function allDayItemsForDay(day, tasks, holidays, events) {
  const dayHolidays = holidays.filter(h => isWithinInterval(day, { start: parseISO(h.startDate), end: parseISO(h.endDate) }))
  const dayEvents = events.filter(e => e._range && isWithinInterval(day, e._range) && !e.startTime)
  const dayTasks = tasks.filter(tk => isWithinInterval(day, tk._range))
  return { dayHolidays, dayEvents, dayTasks }
}

function AllDayStrip({ day, tasks, holidays, events, classes, onOpenEvent }) {
  const { dayHolidays, dayEvents, dayTasks } = allDayItemsForDay(day, tasks, holidays, events)
  const chips = [
    ...dayHolidays.map(h => ({ key: 'h' + h.id, color: '#d97706', label: h.name })),
    ...dayEvents.map(e => ({ key: 'e' + e.id, color: e.color ?? DEFAULT_COLOR, label: e.title, onClick: () => onOpenEvent?.(e) })),
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

function EventBlock({ segment, onOpenEvent }) {
  const { event, startMinutes, endMinutes, column, columnCount, continuesBefore, continuesAfter } = segment
  const color = event.color ?? DEFAULT_COLOR
  const width = 100 / columnCount

  return (
    <div
      onPointerDown={e => e.stopPropagation()}
      onClick={() => onOpenEvent?.(event)}
      title={event.title}
      className="absolute overflow-hidden px-1 py-0.5 text-[10px] leading-tight cursor-pointer"
      style={{
        top: (startMinutes / 60) * HOUR_HEIGHT,
        height: Math.max(18, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT),
        left: `calc(${column * width}% + 2px)`,
        width: `calc(${width}% - 4px)`,
        backgroundColor: color + '33',
        color,
        border: `1px solid ${color}55`,
        borderTopLeftRadius: continuesBefore ? 0 : 4,
        borderTopRightRadius: continuesBefore ? 0 : 4,
        borderBottomLeftRadius: continuesAfter ? 0 : 4,
        borderBottomRightRadius: continuesAfter ? 0 : 4,
        borderTopWidth: continuesBefore ? 0 : 1,
        borderBottomWidth: continuesAfter ? 0 : 1,
      }}>
      <span className="font-medium">{event.title}</span>
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

export function HourGrid({ days, tasks, holidays, events, classes, onOpenEvent, onCreateRange }) {
  const showHeader = days.length > 1
  const columnsRef = useRef(null)
  const [drag, setDrag] = useState(null)

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
    <div className="flex-1 overflow-auto">
      <div className="flex border-b border-border/40 sticky top-0 bg-background z-10">
        <div className="w-12 shrink-0" />
        {days.map(day => (
          <div key={day.toISOString()} className="flex-1 border-r border-border/40 border-l border-l-border/40 min-w-0">
            {showHeader && (
              <div className={`text-[10px] font-semibold text-center py-1 uppercase tracking-wide ${isSameDay(day, new Date()) ? 'text-primary' : 'text-muted-foreground'}`}>
                {format(day, 'EEE d')}
              </div>
            )}
            <AllDayStrip day={day} tasks={tasks} holidays={holidays} events={events} classes={classes} onOpenEvent={onOpenEvent} />
          </div>
        ))}
      </div>
      <div className="flex">
        <div className="w-12 shrink-0">
          {HOURS.map(h => (
            <div key={h} className="text-[10px] text-muted-foreground text-right pr-1 border-b border-transparent"
              style={{ height: HOUR_HEIGHT }}>
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        <div ref={columnsRef} className="flex flex-1 border-l border-border/40 touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={cancelDrag}>
          {days.map((day, dayIndex) => {
            const preview = previewFor(dayIndex)
            return (
              <div key={day.toISOString()} className="relative flex-1 border-r border-border/40 select-none"
                style={{ height: DAY_HEIGHT }}>
                {HOURS.map(h => (
                  <div key={h} className="absolute inset-x-0 border-b border-border/30"
                    style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
                ))}
                {layoutDayEvents(events, day).map(segment => (
                  <EventBlock key={segment.event.id} segment={segment} onOpenEvent={onOpenEvent} />
                ))}
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
