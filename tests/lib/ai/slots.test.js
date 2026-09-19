import { describe, it, expect } from 'vitest'
import { resolveSlot, validateSlots, listConfiguredSlots } from '@/lib/ai/slots'

const MEDIUM_SLOT = { provider: 'anthropic', model: 'claude-medium' }
const LOW_SLOT = { provider: 'custom', model: 'small-model' }
const HIGH_SLOT = { provider: 'anthropic', model: 'claude-high' }

describe('slots', () => {
  it('resolves a configured low slot to itself', () => {
    const slots = { low: LOW_SLOT, medium: MEDIUM_SLOT, high: HIGH_SLOT }
    expect(resolveSlot(slots, 'low')).toEqual({ slot: LOW_SLOT, resolvedFrom: 'low' })
  })

  it('falls back low -> medium when low is missing', () => {
    const slots = { medium: MEDIUM_SLOT, high: HIGH_SLOT }
    expect(resolveSlot(slots, 'low')).toEqual({ slot: MEDIUM_SLOT, resolvedFrom: 'medium' })
  })

  it('falls back high -> medium when high is missing', () => {
    const slots = { low: LOW_SLOT, medium: MEDIUM_SLOT }
    expect(resolveSlot(slots, 'high')).toEqual({ slot: MEDIUM_SLOT, resolvedFrom: 'medium' })
  })

  it('resolves everything to medium when both low and high are missing', () => {
    const slots = { medium: MEDIUM_SLOT }
    expect(resolveSlot(slots, 'low')).toEqual({ slot: MEDIUM_SLOT, resolvedFrom: 'medium' })
    expect(resolveSlot(slots, 'medium')).toEqual({ slot: MEDIUM_SLOT, resolvedFrom: 'medium' })
    expect(resolveSlot(slots, 'high')).toEqual({ slot: MEDIUM_SLOT, resolvedFrom: 'medium' })
  })

  it('returns null slot when medium itself is missing', () => {
    const slots = {}
    expect(resolveSlot(slots, 'medium')).toEqual({ slot: null, resolvedFrom: null })
    expect(resolveSlot(slots, 'low')).toEqual({ slot: null, resolvedFrom: null })
    expect(resolveSlot(slots, 'high')).toEqual({ slot: null, resolvedFrom: null })
  })

  it('validateSlots only complains about a missing medium', () => {
    expect(validateSlots({ medium: MEDIUM_SLOT })).toEqual({ valid: true, errors: [] })
    expect(validateSlots({ low: LOW_SLOT, high: HIGH_SLOT })).toEqual({
      valid: false,
      errors: [{ slot: 'medium', reason: 'missing-required-slot' }],
    })
  })

  it('produces no warning for empty low/high slots', () => {
    const { errors } = validateSlots({ medium: MEDIUM_SLOT })
    expect(errors.some(e => e.slot === 'low')).toBe(false)
    expect(errors.some(e => e.slot === 'high')).toBe(false)
  })

  it('listConfiguredSlots reports only slots with a provider and model', () => {
    expect(listConfiguredSlots({ medium: MEDIUM_SLOT })).toEqual(['medium'])
    expect(listConfiguredSlots({ low: LOW_SLOT, medium: MEDIUM_SLOT, high: HIGH_SLOT })).toEqual([
      'low',
      'medium',
      'high',
    ])
    expect(listConfiguredSlots({})).toEqual([])
  })
})
