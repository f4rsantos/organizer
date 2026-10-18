const FRESH_STEPS = ['welcome', 'profile', 'dates', 'classes', 'tour', 'apps', 'ready']
const RESTORE_STEPS = ['welcome', 'restore']
const OPTIONAL_STEPS = new Set(['classes', 'apps', 'tour'])

export function onboardingSteps({ path, noneMode }) {
  if (path === 'restore') return RESTORE_STEPS
  if (path !== 'fresh') return ['welcome']
  if (noneMode) return FRESH_STEPS.filter(step => step !== 'dates')
  return FRESH_STEPS
}

export function isOptionalStep(step) {
  return OPTIONAL_STEPS.has(step)
}

function hasDatedActiveSemester({ semesters, activeSemesterId }) {
  const active = (semesters ?? []).find(s => s.id === activeSemesterId)
  return Boolean(active?.startDate && active?.endDate)
}

export function stepBlocker(step, state) {
  if (step !== 'dates' || state.noneMode) return null
  return hasDatedActiveSemester(state) ? null : 'needsDates'
}
