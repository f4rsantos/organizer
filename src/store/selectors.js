import { computeCurrentWeek, computeWeekCount } from '@/lib/semesterUtils'
import { weightedAverage, neededGrade, ectsWeightedAverage } from '@/lib/gradeUtils'

export function selectActiveSemester(state) {
  return state.semesters.find(s => s.id === state.activeSemesterId) ?? null
}

export function selectSemesterClasses(state, semesterId) {
  return state.classes.filter(c => c.semesterId === semesterId)
}

export function selectCurrentWeek(semester) {
  if (!semester) return null
  return computeCurrentWeek(semester.startDate, semester.endDate)
}

export function selectWeekCount(semester) {
  if (!semester?.startDate || !semester?.endDate) return 0
  return computeWeekCount(semester.startDate, semester.endDate)
}

export function selectClassAverage(gradeData) {
  if (!gradeData?.components) return null
  return weightedAverage(gradeData.components)
}

export function selectNeededGrade(gradeData) {
  if (!gradeData?.components) return null
  return neededGrade(gradeData.components, gradeData.targetGrade ?? 9.5)
}

export function selectSemesterGPA(semId, state) {
  const classes = selectSemesterClasses(state, semId)
  const classData = classes.map(cls => {
    const gradeData = state.grades[semId]?.[cls.id]
    const finalGrade = gradeData?.finalGrade ?? selectClassAverage(gradeData)
    return { ...cls, finalGrade }
  })
  return ectsWeightedAverage(classData)
}
