import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addWeeks, startOfWeek, parseISO, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, addMonths, subMonths, getMonth, getYear } from 'date-fns'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { useCurrentSemester } from '@/hooks/useCurrentSemester'

function weekToDateRange(semesterStartDate, weekNumber) {
  const start = parseISO(semesterStartDate)
  const weekStart = addWeeks(startOfWeek(start, { weekStartsOn: 1 }), weekNumber - 1)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  return { start: weekStart, end: weekEnd }
}

function getTaskDateRange(task, semesterStartDate) {
  if (task.dueDate) return { start: parseISO(task.dueDate), end: parseISO(task.dueDate) }
  const s = weekToDateRange(semesterStartDate, task.weekStart)
  const e = weekToDateRange(semesterStartDate, task.weekEnd)
  return { start: s.start, end: e.end }
}

function DayCell({ day, isCurrentMonth, tasks, holidays, classes }) {
  const isToday = isSameDay(day, new Date())
  const dayTasks = tasks.filter(t => {
    const range = t._range
    return isWithinInterval(day, { start: range.start, end: range.end })
  })
  const dayHolidays = holidays.filter(h =>
    isWithinInterval(day, { start: parseISO(h.startDate), end: parseISO(h.endDate) })
  )

  return (
    <div className={`min-h-[72px] p-1 border-b border-r border-border/40 flex flex-col gap-0.5 ${!isCurrentMonth ? 'opacity-30' : ''}`}>
      <span className={`text-xs font-medium self-start leading-none mb-0.5 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
        {format(day, 'd')}
      </span>
      {dayHolidays.map(h => (
        <div key={h.id} className="text-[10px] leading-tight px-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 truncate">
          {h.name}
        </div>
      ))}
      {dayTasks.map(t => {
        const cls = classes.find(c => c.id === t.classId)
        const color = cls?.color ?? '#6366f1'
        return (
          <div key={t.id} title={t.title}
            className="text-[10px] leading-tight px-1 rounded truncate"
            style={{ backgroundColor: color + '33', color }}>
            {t.title}
          </div>
        )
      })}
    </div>
  )
}

export function CalendarTab() {
  const { semester, weekCount } = useCurrentSemester()
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const allClasses = useStore(s => s.classes)
  const allTasks = useStore(s => s.tasks)
  const allHolidays = useStore(s => s.holidays)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const semStart = semester ? parseISO(semester.startDate) : null
  const semEnd = semester ? parseISO(semester.endDate) : null

  const [month, setMonth] = useState(() => {
    const today = new Date()
    if (!semStart || !semEnd) return today
    if (today < semStart) return semStart
    if (today > semEnd) return semEnd
    return today
  })

  const classes = semester ? allClasses.filter(c => c.semesterId === activeSemesterId) : []
  const holidays = semester ? (allHolidays ?? []).filter(h => h.semesterId === activeSemesterId) : []
  const tasks = semester
    ? allTasks
        .filter(t => t.semesterId === activeSemesterId && t.showOnCalendar !== false)
        .map(t => ({ ...t, _range: getTaskDateRange(t, semester.startDate) }))
    : []

  const canPrev = semester ? !(getMonth(month) === getMonth(semStart) && getYear(month) === getYear(semStart)) : true
  const canNext = semester ? !(getMonth(month) === getMonth(semEnd) && getYear(month) === getYear(semEnd)) : true

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: new Date(Math.min(
    endOfMonth(month).getTime(),
    new Date(gridStart.getTime() + 41 * 24 * 60 * 60 * 1000).getTime()
  )) })

  // Pad to full 6-week grid
  while (days.length < 42) days.push(new Date(days[days.length - 1].getTime() + 86400000))

  const DOW = lang === 'pt'
    ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-screen select-none">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(m => subMonths(m, 1))} disabled={!canPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="flex-1 text-center font-semibold text-sm capitalize">
          {format(month, 'MMMM yyyy')}
        </p>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(m => addMonths(m, 1))} disabled={!canNext}>
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
            <DayCell
              key={day.toISOString()}
              day={day}
              isCurrentMonth={isSameMonth(day, month)}
              tasks={tasks}
              holidays={holidays}
              classes={classes}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
