import { describe, it, expect } from 'vitest'
import { findMentionQuery } from './useTaskMention.js'

describe('multiple @ in one block', () => {
  it('targets the last @ before the caret', () => {
    const found = findMentionQuery('see @alpha then @bet')
    expect(found).toEqual({ length: 4, query: 'bet' })
  })

  it('offset lands exactly on the active @', () => {
    const text = 'see @alpha then @bet'
    const found = findMentionQuery(text)
    const caret = text.length
    const atPos = caret - found.length
    expect(text[atPos]).toBe('@')
    expect(atPos).toBe(text.lastIndexOf('@'))
  })

  it('ignores a completed earlier mention', () => {
    const text = 'ping @done and @x'
    const found = findMentionQuery(text)
    const atPos = text.length - found.length
    expect(text[atPos]).toBe('@')
    expect(found.query).toBe('x')
  })

  it('returns null when the last @ has a space after it', () => {
    expect(findMentionQuery('a @alpha b')).toBe(null)
  })

  it('handles a bare @ right after another mention word', () => {
    const text = 'x @a @'
    const found = findMentionQuery(text)
    expect(found).toEqual({ length: 1, query: '' })
    expect(text[text.length - found.length]).toBe('@')
  })
})
