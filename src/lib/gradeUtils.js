export const DEFAULT_GRADE_SCALE = 20
export const DEFAULT_PASS_THRESHOLD = 9.5

export function gradeScaleOf(settings) {
  const value = Number(settings?.gradeScale)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_GRADE_SCALE
}

export function passThresholdOf(settings) {
  const value = Number(settings?.passThreshold)
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_PASS_THRESHOLD
}

export function roundPT(value) {
  return Math.round(value * 10) / 10
}

export function flattenComponents(components) {
  return components.flatMap(c => {
    if (!c.subcomponents?.length) return [c]
    const subWeight = c.weight / c.subcomponents.length
    return c.subcomponents.map(s => ({ ...s, weight: subWeight }))
  })
}

export function weightedAverage(components) {
  const flat = flattenComponents(components)
  const graded = flat.filter(c => c.grade != null && c.grade !== '')
  if (graded.length === 0) return null
  const totalWeight = graded.reduce((sum, c) => sum + c.weight, 0)
  if (totalWeight === 0) return null
  return roundPT(graded.reduce((sum, c) => sum + c.grade * c.weight, 0) / totalWeight)
}

export function accumulatedScore(components) {
  const flat = flattenComponents(components)
  const graded = flat.filter(c => c.grade != null && c.grade !== '')
  if (graded.length === 0) return null
  return roundPT(graded.reduce((sum, c) => sum + c.grade * c.weight, 0))
}

export function neededGrade(components, target) {
  const flat = flattenComponents(components)
  const doneWeight = flat
    .filter(c => c.grade != null && c.grade !== '')
    .reduce((sum, c) => sum + c.weight * c.grade, 0)
  const remainingWeight = flat
    .filter(c => c.grade === null || c.grade === '')
    .reduce((sum, c) => sum + c.weight, 0)
  if (remainingWeight === 0) return null
  return roundPT((target - doneWeight) / remainingWeight)
}

export function ectsWeightedAverage(classes) {
  const valid = classes.filter(c => c.finalGrade !== null)
  const totalEcts = valid.reduce((sum, c) => sum + (c.ects ?? 6), 0)
  if (totalEcts === 0) return null
  const weighted = valid.reduce((sum, c) => sum + Math.round(c.finalGrade) * (c.ects ?? 6), 0)
  return roundPT(weighted / totalEcts)
}

export function foldSemesterIntoAvg(previousAvg, numSemesters, gpa) {
  if (gpa == null) return previousAvg
  const count = numSemesters ?? 0
  const prev = previousAvg ?? 0
  if (count <= 0 || prev <= 0) return roundPT(gpa)
  return roundPT((prev * count + gpa) / (count + 1))
}

export function formatGrade(value) {
  if (value === null || value === undefined) return '—'
  return value.toFixed(1)
}
