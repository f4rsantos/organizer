import { readJson, writeJson } from '@/lib/safeStorage'

const BUDGET_STORAGE_KEY = 'f4rsantos.github.io/organizer:ai-budget'
const SLOT_NAMES = ['low', 'medium', 'high']
const MAX_ITERATION_ESTIMATE = 6

function todayKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function emptySlotCounters() {
  return { requestCount: 0, inputTokens: 0, outputTokens: 0, estimatedSpend: 0 }
}

function emptyBudgetState() {
  return {
    day: todayKey(),
    slots: {
      low: emptySlotCounters(),
      medium: emptySlotCounters(),
      high: emptySlotCounters(),
    },
  }
}

export function loadBudgetState() {
  const stored = readJson(BUDGET_STORAGE_KEY, null)
  if (!stored) return emptyBudgetState()
  if (stored.day !== todayKey()) return emptyBudgetState()
  return stored
}

export function saveBudgetState(state) {
  return writeJson(BUDGET_STORAGE_KEY, state)
}

export function clearBudgetState() {
  try {
    localStorage.removeItem(BUDGET_STORAGE_KEY)
  } catch {
    return
  }
}

export function recordAiRequest(state, { slotName, model, requestCount, inputTokens, outputTokens, spend, timestamp }) {
  const current = state?.day === todayKey() ? state : emptyBudgetState()
  const slotCounters = current.slots?.[slotName] ?? emptySlotCounters()

  const nextSlotCounters = {
    requestCount: slotCounters.requestCount + (requestCount ?? 1),
    inputTokens: slotCounters.inputTokens + (inputTokens ?? 0),
    outputTokens: slotCounters.outputTokens + (outputTokens ?? 0),
    estimatedSpend: slotCounters.estimatedSpend + (spend ?? 0),
    lastModel: model ?? slotCounters.lastModel ?? null,
    lastRequestAt: timestamp ?? Date.now(),
  }

  return {
    day: current.day,
    slots: {
      ...current.slots,
      [slotName]: nextSlotCounters,
    },
  }
}

export function estimatedRequestsUsed(state, slotName) {
  return state?.slots?.[slotName]?.requestCount ?? 0
}

export function estimatedRequestsRemaining(state, slotName, dailyCap) {
  if (dailyCap == null) return null
  const used = estimatedRequestsUsed(state, slotName)
  return Math.max(0, dailyCap - used)
}

export function canStartRun({ state, slotName, dailyCap, estimatedRequestsNeeded }) {
  if (dailyCap == null) return { allowed: true, remaining: null, reason: null }

  const remaining = estimatedRequestsRemaining(state, slotName, dailyCap)
  const needed = estimatedRequestsNeeded ?? MAX_ITERATION_ESTIMATE

  if (remaining < needed) {
    return { allowed: false, remaining, reason: 'insufficient-remaining-budget' }
  }

  return { allowed: true, remaining, reason: null }
}

function formatSlotCount(state, slots, slotName, labels) {
  const label = labels?.[slotName] ?? slotName
  const used = estimatedRequestsUsed(state, slotName)
  const dailyCap = slots?.[slotName]?.dailyCap
  if (dailyCap == null) return `${label} ${used}`
  return `${label} ${used}/${dailyCap}`
}

function formatSlotSpend(state, slotName, labels) {
  const label = labels?.[slotName] ?? slotName
  const spend = state?.slots?.[slotName]?.estimatedSpend ?? 0
  return `${label} ~$${spend.toFixed(2)}`
}

export function formatBudget(state, slots, labels) {
  const parts = SLOT_NAMES
    .filter(slotName => slots?.[slotName]?.provider && slots?.[slotName]?.model)
    .map(slotName => (
      slots[slotName]?.optimizeFor === 'tokens'
        ? formatSlotSpend(state, slotName, labels)
        : formatSlotCount(state, slots, slotName, labels)
    ))

  return parts.join(' · ')
}
