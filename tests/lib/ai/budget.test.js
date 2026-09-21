import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  loadBudgetState,
  saveBudgetState,
  recordAiRequest,
  estimatedRequestsUsed,
  canStartRun,
  formatBudget,
} from '@/lib/ai/budget'

function createMemoryStorage() {
  const map = new Map()
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)) },
    removeItem: k => { map.delete(k) },
    clear: () => { map.clear() },
  }
}

const MEDIUM_SLOT = { provider: 'anthropic', model: 'claude-medium' }
const LOW_SLOT = { provider: 'custom', model: 'small-model', dailyCap: 4000 }
const HIGH_SLOT = { provider: 'anthropic', model: 'claude-high', dailyCap: 20 }
const LABELS = { low: 'Low', medium: 'Medium', high: 'High' }

describe('budget', () => {
  let originalLocalStorage

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage
    globalThis.localStorage = createMemoryStorage()
  })

  afterEach(() => {
    globalThis.localStorage = originalLocalStorage
    vi.useRealTimers()
  })

  it('records requests per slot and accumulates spend', () => {
    let state = loadBudgetState()
    state = recordAiRequest(state, { slotName: 'medium', model: 'claude-medium', requestCount: 1, inputTokens: 100, outputTokens: 50, spend: 0.01 })
    state = recordAiRequest(state, { slotName: 'medium', model: 'claude-medium', requestCount: 1, inputTokens: 200, outputTokens: 80, spend: 0.02 })

    expect(estimatedRequestsUsed(state, 'medium')).toBe(2)
    expect(state.slots.medium.inputTokens).toBe(300)
    expect(state.slots.medium.outputTokens).toBe(130)
    expect(state.slots.medium.estimatedSpend).toBeCloseTo(0.03)
    expect(estimatedRequestsUsed(state, 'low')).toBe(0)
  })

  it('rolls over the day window on local date change', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-12T10:00:00'))

    let state = loadBudgetState()
    state = recordAiRequest(state, { slotName: 'medium', requestCount: 3 })
    saveBudgetState(state)
    expect(estimatedRequestsUsed(loadBudgetState(), 'medium')).toBe(3)

    vi.setSystemTime(new Date('2026-09-13T00:05:00'))
    const rolledOver = loadBudgetState()
    expect(estimatedRequestsUsed(rolledOver, 'medium')).toBe(0)
    expect(rolledOver.day).toBe('2026-09-13')
  })

  it('refuses to start a run when remaining requests are below what is needed', () => {
    let state = loadBudgetState()
    state = recordAiRequest(state, { slotName: 'high', requestCount: 18 })

    const result = canStartRun({ state, slotName: 'high', dailyCap: 20, estimatedRequestsNeeded: 6 })
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(2)
    expect(result.reason).toBe('insufficient-remaining-budget')
  })

  it('allows starting a run when remaining requests cover what is needed', () => {
    let state = loadBudgetState()
    state = recordAiRequest(state, { slotName: 'high', requestCount: 5 })

    const result = canStartRun({ state, slotName: 'high', dailyCap: 20, estimatedRequestsNeeded: 6 })
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(15)
  })

  it('never blocks when no cap is declared', () => {
    let state = loadBudgetState()
    state = recordAiRequest(state, { slotName: 'medium', requestCount: 1000 })

    const result = canStartRun({ state, slotName: 'medium', dailyCap: null, estimatedRequestsNeeded: 6 })
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeNull()
  })

  it('omits empty slots from the formatted requests string, never shows zero', () => {
    let state = loadBudgetState()
    state = recordAiRequest(state, { slotName: 'medium', requestCount: 11 })

    const slots = { medium: MEDIUM_SLOT }
    const formatted = formatBudget(state, slots, LABELS)
    expect(formatted).toBe('Medium 11')
    expect(formatted).not.toContain('Low')
    expect(formatted).not.toContain('High')
  })

  it('falls back to the slot name when no labels are supplied', () => {
    let state = loadBudgetState()
    state = recordAiRequest(state, { slotName: 'medium', requestCount: 2 })

    expect(formatBudget(state, { medium: MEDIUM_SLOT })).toBe('medium 2')
  })

  it('uses translated labels rather than hardcoded English', () => {
    let state = loadBudgetState()
    state = recordAiRequest(state, { slotName: 'medium', requestCount: 5 })

    const ptLabels = { low: 'Baixo', medium: 'Normal', high: 'Melhor' }
    expect(formatBudget(state, { medium: MEDIUM_SLOT }, ptLabels)).toBe('Normal 5')
  })

  it('formats per-slot counts with caps when configured', () => {
    let state = loadBudgetState()
    state = recordAiRequest(state, { slotName: 'low', requestCount: 240 })
    state = recordAiRequest(state, { slotName: 'medium', requestCount: 11 })
    state = recordAiRequest(state, { slotName: 'high', requestCount: 3 })

    const slots = { low: LOW_SLOT, medium: MEDIUM_SLOT, high: HIGH_SLOT }
    const formatted = formatBudget(state, slots, LABELS)
    expect(formatted).toBe('Low 240/4000 · Medium 11 · High 3/20')
  })

  it('formats estimated spend for a slot set to optimize for tokens', () => {
    let state = loadBudgetState()
    state = recordAiRequest(state, { slotName: 'medium', spend: 0.03 })
    state = recordAiRequest(state, { slotName: 'high', spend: 0.01 })

    const slots = {
      medium: { ...MEDIUM_SLOT, optimizeFor: 'tokens' },
      high: { ...HIGH_SLOT, optimizeFor: 'tokens' },
    }
    const formatted = formatBudget(state, slots, LABELS)
    expect(formatted).toBe('Medium ~$0.03 · High ~$0.01')
  })

  it('mixes count and spend display when slots use different optimizeFor', () => {
    let state = loadBudgetState()
    state = recordAiRequest(state, { slotName: 'medium', requestCount: 11 })
    state = recordAiRequest(state, { slotName: 'high', spend: 0.01 })

    const slots = {
      medium: MEDIUM_SLOT,
      high: { ...HIGH_SLOT, optimizeFor: 'tokens' },
    }
    const formatted = formatBudget(state, slots, LABELS)
    expect(formatted).toBe('Medium 11 · High ~$0.01')
  })
})
