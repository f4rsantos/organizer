import { computeCurrentWeek, computeWeekCount } from '@/lib/semesterUtils'
import { weightedAverage, neededGrade, ectsWeightedAverage } from '@/lib/gradeUtils'
import { isInFlightStatus } from '@/lib/ai/agentOverlay'

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

export function selectNeededGrade(gradeData, passThreshold = 9.5) {
  if (!gradeData?.components) return null
  return neededGrade(gradeData.components, gradeData.targetGrade ?? passThreshold)
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

export function selectActiveAgentRunPill(state) {
  const runId = state.agentRuntime?.activeRunId
  const run = runId ? state.agentRuntime?.runs?.[runId] : null
  if (!run) return null
  const opCount = run.ops?.length ?? 0
  if (isInFlightStatus(run.status)) return { runId, phase: 'working', opCount }
  if (run.status === 'awaitingConfirm') return { runId, phase: 'awaitingConfirm', opCount }
  if (run.status === 'failed') return { runId, phase: 'failed', opCount }
  if (run.status === 'interrupted') return { runId, phase: 'interrupted', opCount }
  if (run.status === 'committed') return { runId, phase: 'done', opCount }
  return null
}
