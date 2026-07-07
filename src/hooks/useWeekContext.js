import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { getWeekContext } from '@/lib/weekContext'

export function useWeekContext() {
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const semesters = useStore(s => s.semesters)
  const mode = useStore(s => s.settings?.semesterMode ?? 'semesters')

  const semester = mode === 'none'
    ? null
    : (semesters.find(x => x.id === activeSemesterId) ?? null)

  const ctx = useMemo(() => getWeekContext({ mode, semester }), [mode, semester])

  return {
    mode,
    semester,
    currentWeek: ctx.currentWeek,
    weekCount: ctx.weekCount,
    weekDateRange: ctx.weekDateRange,
    dateToWeek: ctx.dateToWeek,
  }
}
