import { useEffect, useMemo, useState } from 'react'
import { addDays, format, parseISO, subMonths } from 'date-fns'
import { useStore } from '@/store/useStore'
import { useWeekContext } from '@/hooks/useWeekContext'
import { useMergedEvents } from '@/hooks/useMergedEvents'
import { expandEventsForRange } from '@/lib/recurrence'
import { EXAM_HORIZON_DAYS } from '@/lib/today/todayBrief'
import { usePublicHolidays } from '@/hooks/usePublicHolidays'

const FALLBACK_LOOKBACK_MONTHS = 6

const CLOCK_TICK_MS = 60_000

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), CLOCK_TICK_MS)
    return () => clearInterval(id)
  }, [])
  return { today: format(now, 'yyyy-MM-dd'), nowTime: format(now, 'HH:mm') }
}

export function useStudyCalendar(extraEvents) {
  const { mode, semester } = useWeekContext()
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const allClasses = useStore(s => s.classes)
  const allHolidays = useStore(s => s.holidays)
  const publicHolidays = usePublicHolidays()
  const allEvents = useMergedEvents()
  const { today, nowTime } = useNow()
  const scopeId = mode === 'none' ? null : activeSemesterId
  const semesterStart = semester?.startDate ?? null

  const classes = useMemo(
    () => (allClasses ?? []).filter(c => mode === 'none' || c.semesterId === scopeId),
    [allClasses, mode, scopeId],
  )
  const holidays = useMemo(
    () => [...(allHolidays ?? []).filter(h => h.semesterId === scopeId), ...publicHolidays],
    [allHolidays, scopeId, publicHolidays],
  )
  const events = useMemo(() => {
    const from = semesterStart ? parseISO(semesterStart) : subMonths(parseISO(today), FALLBACK_LOOKBACK_MONTHS)
    const to = addDays(parseISO(today), EXAM_HORIZON_DAYS)
    const scoped = allEvents.filter(e => e.semesterId == null || e.semesterId === scopeId)
    return [...expandEventsForRange(scoped, from, to), ...(extraEvents ?? [])]
  }, [allEvents, scopeId, semesterStart, today, extraEvents])

  return { today, nowTime, classes, holidays, events }
}
