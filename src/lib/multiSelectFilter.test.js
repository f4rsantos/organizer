import { describe, expect, it } from 'vitest'
import { ALL_VALUE, resolveMultiSelection } from './multiSelectFilter'

describe('resolveMultiSelection', () => {
  it('picking all clears every other choice', () => {
    expect(resolveMultiSelection(['a', 'b'], ['a', 'b', ALL_VALUE])).toEqual([ALL_VALUE])
  })

  it('picking another option drops all', () => {
    expect(resolveMultiSelection([ALL_VALUE], [ALL_VALUE, 'a'])).toEqual(['a'])
  })

  it('keeps multiple non-all selections', () => {
    expect(resolveMultiSelection(['a'], ['a', 'b'])).toEqual(['a', 'b'])
  })

  it('falls back to all when the last option is removed', () => {
    expect(resolveMultiSelection(['a'], [])).toEqual([ALL_VALUE])
  })

  it('deselecting all with nothing else selected stays all', () => {
    expect(resolveMultiSelection([ALL_VALUE], [])).toEqual([ALL_VALUE])
  })

  it('accepts a scalar previous value', () => {
    expect(resolveMultiSelection(ALL_VALUE, [ALL_VALUE, 'a'])).toEqual(['a'])
  })
})
