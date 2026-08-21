import { describe, it, expect } from 'vitest'
import { normalizeState } from './migrations.js'

describe('widgetsEnabled default', () => {
  it('defaults to true when unset', () => {
    const out = normalizeState({ settings: {} })
    expect(out.settings.widgetsEnabled).toBe(true)
  })

  it('keeps an explicit false', () => {
    const out = normalizeState({ settings: { widgetsEnabled: false } })
    expect(out.settings.widgetsEnabled).toBe(false)
  })

  it('keeps an explicit true', () => {
    const out = normalizeState({ settings: { widgetsEnabled: true } })
    expect(out.settings.widgetsEnabled).toBe(true)
  })
})
