import { resolveSlot } from '@/lib/ai/slots'

export const DEFAULT_ITERATION_CAP = 4
export const MAX_ITERATION_CAP = 6

const ONE_SHOT_CONFIDENCE_THRESHOLD = 0.85
const HIGH_OP_COUNT_THRESHOLD = 4

function normalizeWord(word) {
  return word?.toLowerCase?.().trim?.() ?? ''
}

function goalContainsAny(goal, words) {
  const normalizedGoal = normalizeWord(goal)
  if (!normalizedGoal) return false
  return words.some(word => normalizedGoal.includes(normalizeWord(word)))
}

function isScopedOneShot({ goal, scope, parserConfidence, scopedVerbs }) {
  if (!scope) return false
  if ((parserConfidence ?? 0) < ONE_SHOT_CONFIDENCE_THRESHOLD) return false
  return goalContainsAny(goal, scopedVerbs ?? [])
}

function needsEscalation({ goal, estimatedOpCount, escalationVerbs }) {
  if (goalContainsAny(goal, escalationVerbs ?? [])) return true
  if ((estimatedOpCount ?? 0) >= HIGH_OP_COUNT_THRESHOLD) return true
  return false
}

export function clampIterationCap(cap) {
  const requested = cap ?? DEFAULT_ITERATION_CAP
  return Math.min(requested, MAX_ITERATION_CAP)
}

export function routeRun({
  goal,
  scope,
  parserConfidence,
  userForcedTier,
  estimatedOpCount,
  scopedVerbs,
  escalationVerbs,
  slots,
}) {
  if (userForcedTier === 2) {
    const { slot } = resolveSlot(slots, 'high')
    return { tier: 2, slot, reason: 'user-forced-best' }
  }

  if (isScopedOneShot({ goal, scope, parserConfidence, scopedVerbs })) {
    const { slot } = resolveSlot(slots, 'low')
    return { tier: 'oneShot', slot, reason: 'scoped-single-target' }
  }

  if (needsEscalation({ goal, estimatedOpCount, escalationVerbs })) {
    const { slot } = resolveSlot(slots, 'high')
    return { tier: 2, slot, reason: 'reorganise-or-high-op-count' }
  }

  const { slot } = resolveSlot(slots, 'medium')
  return { tier: 1, slot, reason: 'default' }
}

export function routeRetry({ slots }) {
  const { slot, resolvedFrom } = resolveSlot(slots, 'high')
  if (!resolvedFrom || resolvedFrom !== 'high') {
    return { tier: null, slot: null, reason: 'no-escalation-target' }
  }
  return { tier: 2, slot, reason: 'retry-after-failure' }
}
