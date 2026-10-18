import { describe, it, expect } from 'vitest'
import { pushHistory } from '../../../src/lib/quickAction/history.js'

describe('quick action history', () => {
  it('puts the latest command first', () => {
    expect(pushHistory(['old'], 'new', 5)).toEqual(['new', 'old'])
  })

  it('moves a repeated command to the front instead of duplicating it', () => {
    expect(pushHistory(['a', 'b', 'c'], 'c', 5)).toEqual(['c', 'a', 'b'])
  })

  it('forgets the oldest commands past the limit', () => {
    expect(pushHistory(['b', 'c'], 'a', 2)).toEqual(['a', 'b'])
  })

  it('ignores blank commands', () => {
    expect(pushHistory(['a'], '   ', 5)).toEqual(['a'])
  })
})
