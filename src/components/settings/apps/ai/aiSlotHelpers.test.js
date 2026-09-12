import { describe, it, expect } from 'vitest'
import {
  errorKindStringKey, shouldWarnMissingToolSupport, isSlotFilled,
  localhostHintKey, withSlotPatch, withSlotCleared,
} from './aiSlotHelpers'

describe('errorKindStringKey', () => {
  it('maps known kinds', () => {
    expect(errorKindStringKey('auth')).toBe('aiErrorAuth')
    expect(errorKindStringKey('rateLimit')).toBe('aiErrorRateLimit')
    expect(errorKindStringKey('noSuchModel')).toBe('aiErrorNoSuchModel')
    expect(errorKindStringKey('noToolSupport')).toBe('aiErrorNoToolSupport')
    expect(errorKindStringKey('network')).toBe('aiErrorNetwork')
  })

  it('falls back to unknown', () => {
    expect(errorKindStringKey('something-else')).toBe('aiErrorUnknown')
    expect(errorKindStringKey(undefined)).toBe('aiErrorUnknown')
  })
})

describe('shouldWarnMissingToolSupport', () => {
  it('warns for medium and high', () => {
    expect(shouldWarnMissingToolSupport('medium')).toBe(true)
    expect(shouldWarnMissingToolSupport('high')).toBe(true)
  })

  it('does not warn for low', () => {
    expect(shouldWarnMissingToolSupport('low')).toBe(false)
  })
})

describe('isSlotFilled', () => {
  it('requires both provider and model', () => {
    expect(isSlotFilled({ provider: 'anthropic', model: 'claude' })).toBe(true)
    expect(isSlotFilled({ provider: 'anthropic', model: '' })).toBe(false)
    expect(isSlotFilled({ provider: 'anthropic' })).toBe(false)
    expect(isSlotFilled(undefined)).toBe(false)
  })
})

describe('localhostHintKey', () => {
  it('returns null when base url is empty', () => {
    expect(localhostHintKey('', false)).toBe(null)
  })

  it('returns null for non-loopback hosts', () => {
    expect(localhostHintKey('http://192.168.1.10:11434', false)).toBe(null)
  })

  it('returns the web hint on the web build', () => {
    expect(localhostHintKey('http://localhost:11434', false)).toBe('aiLocalhostHintWeb')
  })

  it('returns the native hint on the native build', () => {
    expect(localhostHintKey('http://127.0.0.1:11434', true)).toBe('aiLocalhostHintNative')
  })

  it('handles malformed urls', () => {
    expect(localhostHintKey('not a url', false)).toBe(null)
  })
})

describe('withSlotPatch', () => {
  it('creates the slots object when absent', () => {
    const result = withSlotPatch(undefined, 'medium', { provider: 'anthropic' })
    expect(result.slots.medium).toEqual({ provider: 'anthropic' })
  })

  it('merges into an existing slot without touching others', () => {
    const base = { slots: { medium: { provider: 'anthropic', model: 'a' }, low: { provider: 'custom', model: 'b' } } }
    const result = withSlotPatch(base, 'medium', { model: 'c' })
    expect(result.slots.medium).toEqual({ provider: 'anthropic', model: 'c' })
    expect(result.slots.low).toEqual({ provider: 'custom', model: 'b' })
  })
})

describe('withSlotCleared', () => {
  it('removes only the targeted slot', () => {
    const base = { slots: { medium: { provider: 'anthropic', model: 'a' }, low: { provider: 'custom', model: 'b' } } }
    const result = withSlotCleared(base, 'low')
    expect(result.slots.low).toBeUndefined()
    expect(result.slots.medium).toEqual({ provider: 'anthropic', model: 'a' })
  })
})
