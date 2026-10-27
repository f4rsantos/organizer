import { describe, it, expect } from 'vitest'
import { normalizeBreakActivitySettings, normalizeBreakUrl } from '../../../src/lib/breakActivity/breakSettings.js'

describe('normalizeBreakUrl', () => {
  it('adds https to a bare host so the link can open', () => {
    expect(normalizeBreakUrl('  youtube.com/watch?v=1 ')).toBe('https://youtube.com/watch?v=1')
  })

  it('keeps http and https links', () => {
    expect(normalizeBreakUrl('http://example.org/a')).toBe('http://example.org/a')
    expect(normalizeBreakUrl('https://example.org/')).toBe('https://example.org/')
  })

  it('refuses script and non-web schemes', () => {
    expect(normalizeBreakUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeBreakUrl('data:text/html,hi')).toBeNull()
    expect(normalizeBreakUrl('file:///etc/passwd')).toBeNull()
  })

  it('returns null for empty or unparsable input', () => {
    expect(normalizeBreakUrl('')).toBeNull()
    expect(normalizeBreakUrl(undefined)).toBeNull()
    expect(normalizeBreakUrl('https://')).toBeNull()
  })
})

describe('normalizeBreakActivitySettings', () => {
  it('falls back to a disabled sudoku setup for missing or bad values', () => {
    expect(normalizeBreakActivitySettings(undefined)).toEqual({ enabled: false, mode: 'sudoku', url: '', difficulty: 'medium' })
    expect(normalizeBreakActivitySettings({ enabled: 'yes', mode: 'game', url: 5, difficulty: 'insane' }))
      .toEqual({ enabled: false, mode: 'sudoku', url: '', difficulty: 'medium' })
  })

  it('keeps a valid link setup', () => {
    const value = { enabled: true, mode: 'link', url: 'https://example.org', difficulty: 'hard' }
    expect(normalizeBreakActivitySettings(value)).toEqual(value)
  })
})
