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
  const graded = flat.filter(c => c.grade !== null && c.grade !== '')
  if (graded.length === 0) return null
  const totalWeight = graded.reduce((sum, c) => sum + c.weight, 0)
  if (totalWeight === 0) return null
  return roundPT(graded.reduce((sum, c) => sum + c.grade * c.weight, 0) / totalWeight)
}

export function accumulatedScore(components) {
  const flat = flattenComponents(components)
  const graded = flat.filter(c => c.grade !== null && c.grade !== '')
  if (graded.length === 0) return null
  return roundPT(graded.reduce((sum, c) => sum + c.grade * c.weight, 0))
}

export function neededGrade(components, target) {
  const flat = flattenComponents(components)
  const doneWeight = flat
    .filter(c => c.grade !== null && c.grade !== '')
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
  const weighted = valid.reduce((sum, c) => sum + c.finalGrade * (c.ects ?? 6), 0)
  return roundPT(weighted / totalEcts)
}

export function formatGrade(value) {
  if (value === null || value === undefined) return '—'
  return value.toFixed(1)
}
