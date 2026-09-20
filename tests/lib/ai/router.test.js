import { describe, it, expect } from 'vitest'
import { routeRun, routeRetry, clampIterationCap, DEFAULT_ITERATION_CAP, MAX_ITERATION_CAP } from '@/lib/ai/router'

const LOW_SLOT = { provider: 'custom', model: 'small-model' }
const MEDIUM_SLOT = { provider: 'anthropic', model: 'claude-medium' }
const HIGH_SLOT = { provider: 'anthropic', model: 'claude-high' }
const FULL_SLOTS = { low: LOW_SLOT, medium: MEDIUM_SLOT, high: HIGH_SLOT }
const SCOPED_VERBS = ['reformat', 'summarise', 'tidy', 'expand', 'shorten', 'tabulate', 'fix']
const ESCALATION_VERBS = ['reorganise', 'reorganize', 'research', 'synthesise', 'synthesize']

describe('router tier 0/oneShot/1/2 triggers', () => {
  it('routes a scoped verb with a scope and high confidence to oneShot on low', () => {
    const result = routeRun({
      goal: 'reformat this note',
      scope: 'note-123',
      parserConfidence: 0.95,
      scopedVerbs: SCOPED_VERBS,
      slots: FULL_SLOTS,
    })
    expect(result).toEqual({ tier: 'oneShot', slot: LOW_SLOT, slotName: 'low', reason: 'scoped-single-target' })
  })

  it('does not match a scoped verb without a scope', () => {
    const result = routeRun({
      goal: 'reformat everything',
      scope: null,
      parserConfidence: 0.95,
      scopedVerbs: SCOPED_VERBS,
      slots: FULL_SLOTS,
    })
    expect(result.tier).not.toBe('oneShot')
  })

  it('does not match a scoped verb with low parser confidence', () => {
    const result = routeRun({
      goal: 'reformat this note',
      scope: 'note-123',
      parserConfidence: 0.4,
      scopedVerbs: SCOPED_VERBS,
      slots: FULL_SLOTS,
    })
    expect(result.tier).not.toBe('oneShot')
  })

  it('routes escalation intent words to tier 2 on high', () => {
    const result = routeRun({
      goal: 'reorganise my notes into folders',
      scope: null,
      parserConfidence: 0.9,
      scopedVerbs: SCOPED_VERBS,
      escalationVerbs: ESCALATION_VERBS,
      slots: FULL_SLOTS,
    })
    expect(result).toEqual({ tier: 2, slot: HIGH_SLOT, slotName: 'high', reason: 'reorganise-or-high-op-count' })
  })

  it('escalates on a non-English escalation verb, proving no English is hardcoded', () => {
    const result = routeRun({
      goal: 'reorganizar as minhas notas',
      scope: null,
      parserConfidence: 0.9,
      scopedVerbs: SCOPED_VERBS,
      escalationVerbs: ['reorganizar', 'pesquisar'],
      slots: FULL_SLOTS,
    })
    expect(result.tier).toBe(2)
  })

  it('does not escalate an English intent word when the locale supplies none', () => {
    const result = routeRun({
      goal: 'reorganise my notes into folders',
      scope: null,
      parserConfidence: 0.9,
      scopedVerbs: SCOPED_VERBS,
      escalationVerbs: [],
      slots: FULL_SLOTS,
    })
    expect(result.tier).toBe(1)
  })

  it('routes a high estimated op count to tier 2', () => {
    const result = routeRun({
      goal: 'do a bunch of edits',
      scope: null,
      estimatedOpCount: 5,
      scopedVerbs: SCOPED_VERBS,
      slots: FULL_SLOTS,
    })
    expect(result.tier).toBe(2)
  })

  it('treats optimizeFor as a cost strategy only, never as a tier override', () => {
    const asRequests = routeRun({
      goal: 'summarise this',
      optimizeFor: 'requests',
      scopedVerbs: SCOPED_VERBS,
      escalationVerbs: ESCALATION_VERBS,
      slots: FULL_SLOTS,
    })
    const asTokens = routeRun({
      goal: 'summarise this',
      optimizeFor: 'tokens',
      scopedVerbs: SCOPED_VERBS,
      escalationVerbs: ESCALATION_VERBS,
      slots: FULL_SLOTS,
    })
    expect(asRequests.tier).toBe(1)
    expect(asTokens.tier).toBe(1)
  })

  it('routes userForcedTier 2 explicitly to tier 2', () => {
    const result = routeRun({
      goal: 'anything',
      userForcedTier: 2,
      scopedVerbs: SCOPED_VERBS,
      slots: FULL_SLOTS,
    })
    expect(result.tier).toBe(2)
  })

  it('defaults to tier 1 on medium otherwise', () => {
    const result = routeRun({
      goal: 'what is on my calendar today',
      scope: null,
      parserConfidence: 0.9,
      scopedVerbs: SCOPED_VERBS,
      slots: FULL_SLOTS,
    })
    expect(result).toEqual({ tier: 1, slot: MEDIUM_SLOT, slotName: 'medium', reason: 'default' })
  })

  it('honours the word list from the parameter, not a hardcoded English list', () => {
    const ptVerbs = ['reformatar', 'resumir']
    const result = routeRun({
      goal: 'reformatar esta nota',
      scope: 'note-123',
      parserConfidence: 0.95,
      scopedVerbs: ptVerbs,
      slots: FULL_SLOTS,
    })
    expect(result.tier).toBe('oneShot')

    const englishMiss = routeRun({
      goal: 'reformat this note',
      scope: 'note-123',
      parserConfidence: 0.95,
      scopedVerbs: ptVerbs,
      slots: FULL_SLOTS,
    })
    expect(englishMiss.tier).not.toBe('oneShot')
  })

  it('falls back oneShot to medium when low slot is missing', () => {
    const slots = { medium: MEDIUM_SLOT, high: HIGH_SLOT }
    const result = routeRun({
      goal: 'reformat this note',
      scope: 'note-123',
      parserConfidence: 0.95,
      scopedVerbs: SCOPED_VERBS,
      slots,
    })
    expect(result.slot).toEqual(MEDIUM_SLOT)
  })
})

describe('routeRetry', () => {
  it('escalates to high on retry when high is configured', () => {
    const result = routeRetry({ slots: FULL_SLOTS })
    expect(result).toEqual({ tier: 2, slot: HIGH_SLOT, slotName: 'high', reason: 'retry-after-failure' })
  })

  it('reports no escalation target when high resolves down to medium', () => {
    const slots = { medium: MEDIUM_SLOT }
    const result = routeRetry({ slots })
    expect(result).toEqual({ tier: null, slot: null, slotName: null, reason: 'no-escalation-target' })
  })
})

describe('iteration cap', () => {
  it('defaults to 4', () => {
    expect(clampIterationCap(undefined)).toBe(DEFAULT_ITERATION_CAP)
  })

  it('clamps at the hard cap of 6', () => {
    expect(clampIterationCap(10)).toBe(MAX_ITERATION_CAP)
    expect(clampIterationCap(6)).toBe(6)
  })

  it('passes through a value under the cap', () => {
    expect(clampIterationCap(3)).toBe(3)
  })
})
