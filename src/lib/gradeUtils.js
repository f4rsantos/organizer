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

const hasCustomShare = sub => Number.isFinite(sub?.share)

function resolveShares(subs) {
  if (subs.length === 0) return []
  const customTotal = subs.filter(hasCustomShare).reduce((sum, s) => sum + s.share, 0)
  const unsetCount = subs.filter(s => !hasCustomShare(s)).length
  if (unsetCount > 0) {
    const leftover = Math.max(0, 1 - customTotal) / unsetCount
    return subs.map(s => hasCustomShare(s) ? s.share : leftover)
  }
  if (customTotal <= 0) return subs.map(() => 1 / subs.length)
  return subs.map(s => s.share / customTotal)
}

export function subcomponentWeights(component) {
  const weight = component?.weight || 0
  return resolveShares(component?.subcomponents ?? []).map(share => share * weight)
}

function releasableLocks(subs, subId, lockedIds) {
  const existing = new Set(subs.map(s => s.id))
  const locks = lockedIds.filter(id => id !== subId && existing.has(id))
  const freeSlots = subs.length - 1
  return locks.slice(Math.max(0, locks.length - freeSlots + 1))
}

export function setSubcomponentShare(subs, subId, share, lockedIds = []) {
  const shares = resolveShares(subs)
  const locks = releasableLocks(subs, subId, lockedIds)
  const isLocked = id => locks.includes(id)
  const isFree = s => s.id !== subId && !isLocked(s.id)
  const lockedTotal = subs.reduce((sum, s, i) => isLocked(s.id) ? sum + shares[i] : sum, 0)
  const available = Math.max(0, 1 - lockedTotal)
  const freeCount = subs.filter(isFree).length
  const target = freeCount === 0 ? available : Math.min(available, Math.max(0, share))
  const freeTotal = subs.reduce((sum, s, i) => isFree(s) ? sum + shares[i] : sum, 0)
  const rest = available - target
  const subcomponents = subs.map((s, i) => {
    if (s.id === subId) return { ...s, share: target }
    if (isLocked(s.id)) return { ...s, share: shares[i] }
    const freeShare = freeTotal > 0 ? rest * shares[i] / freeTotal : rest / freeCount
    return { ...s, share: freeShare }
  })
  return { subcomponents, lockedIds: [...locks, subId] }
}

const TENTHS_PER_PERCENT = 10

export function roundedPercents(weights, totalWeight) {
  const toTenths = weight => weight * 100 * TENTHS_PER_PERCENT
  const exact = weights.map(toTenths)
  const floors = exact.map(Math.floor)
  const shortfall = Math.round(toTenths(totalWeight)) - floors.reduce((sum, f) => sum + f, 0)
  const byRemainder = exact
    .map((value, i) => ({ i, remainder: value - floors[i] }))
    .sort((x, y) => y.remainder - x.remainder)
  byRemainder.slice(0, Math.max(0, shortfall)).forEach(({ i }) => { floors[i] += 1 })
  return floors.map(tenths => tenths / TENTHS_PER_PERCENT)
}

export function flattenComponents(components) {
  return components.flatMap(c => {
    if (!c.subcomponents?.length) return [c]
    const weights = subcomponentWeights(c)
    return c.subcomponents.map((s, i) => ({ ...s, weight: weights[i] }))
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

export function gradedFraction(components) {
  const flat = flattenComponents(components)
  const total = flat.reduce((sum, c) => sum + (Number(c.weight) || 0), 0)
  if (total <= 0) return 0
  const done = flat
    .filter(c => c.grade != null && c.grade !== '')
    .reduce((sum, c) => sum + (Number(c.weight) || 0), 0)
  return Math.min(1, done / total)
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

const DECIMAL_TYPING_RE = /^-?\d*(?:[.,]\d*)?$/

export function isPartialDecimal(raw) {
  if (typeof raw !== 'string') return false
  return DECIMAL_TYPING_RE.test(raw)
}

export function parseGradeInput(raw, { min, max } = {}) {
  if (raw === null || raw === undefined) return null
  const trimmed = String(raw).trim()
  if (trimmed === '') return null
  const parsed = parseFloat(trimmed.replace(',', '.'))
  if (!Number.isFinite(parsed)) return null
  let value = parsed
  if (Number.isFinite(min)) value = Math.max(min, value)
  if (Number.isFinite(max)) value = Math.min(max, value)
  return value
}
