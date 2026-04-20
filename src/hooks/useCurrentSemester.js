import { useStore } from '@/store/useStore'
import { selectCurrentWeek, selectWeekCount } from '@/store/selectors'

export function useCurrentSemester() {
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const semesters = useStore(s => s.semesters)
  const semester = semesters.find(x => x.id === activeSemesterId) ?? null
  const currentWeek = selectCurrentWeek(semester)
  const weekCount = selectWeekCount(semester)
  return { semester, currentWeek, weekCount }
}
