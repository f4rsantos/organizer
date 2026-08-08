import { describe, it, expect } from 'vitest'
import { editDistance, maxEditsFor, closestWord } from './editDistance.js'

describe('editDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(editDistance('complete', 'complete')).toBe(0)
  })

  it('counts substitutions, insertions and deletions', () => {
    expect(editDistance('complte', 'complete')).toBe(1)
    expect(editDistance('kitten', 'sitting')).toBe(3)
    expect(editDistance('delet', 'delete')).toBe(1)
    expect(editDistance('mark', 'move')).toBe(3)
  })

  it('handles empty strings', () => {
    expect(editDistance('', '')).toBe(0)
    expect(editDistance('', 'abc')).toBe(3)
    expect(editDistance('abc', '')).toBe(3)
  })

  it('is symmetric', () => {
    expect(editDistance('undo', 'undoo')).toBe(editDistance('undoo', 'undo'))
  })

  it('short-circuits to max+1 once the bound is exceeded', () => {
    expect(editDistance('kitten', 'sitting', 1)).toBe(2)
    expect(editDistance('a', 'zzzzzzzz', 2)).toBe(3)
  })

  it('still returns the true distance when it is within the bound', () => {
    expect(editDistance('complte', 'complete', 2)).toBe(1)
  })
})

describe('maxEditsFor', () => {
  it('requires an exact match for short tokens', () => {
    for (const w of ['to', 'on', 'in', 'add']) expect(maxEditsFor(w)).toBe(0)
  })

  it('allows one edit at 4-6 chars and two at 7+', () => {
    expect(maxEditsFor('mark')).toBe(1)
    expect(maxEditsFor('delete')).toBe(1)
    expect(maxEditsFor('complete')).toBe(2)
  })
})

describe('closestWord', () => {
  const verbs = ['complete', 'finish', 'delete', 'remove', 'move', 'share', 'mark', 'undo']

  it('resolves a typo to the intended verb', () => {
    expect(closestWord('complte', verbs)).toBe('complete')
    expect(closestWord('delet', verbs)).toBe('delete')
    expect(closestWord('remvoe', verbs)).toBe('remove')
  })

  it('does not confuse distinct short verbs', () => {
    expect(closestWord('mark', verbs)).toBe('mark')
    expect(closestWord('move', verbs)).toBe('move')
  })

  it('never fuzzy-matches a token of 3 chars or fewer', () => {
    expect(closestWord('mve', verbs)).toBeNull()
    expect(closestWord('to', verbs)).toBeNull()
  })

  it('returns null when nothing is close enough', () => {
    expect(closestWord('bananas', verbs)).toBeNull()
  })

  it('picks the lowest distance among candidates', () => {
    expect(closestWord('shove', ['share', 'move', 'shove'])).toBe('shove')
  })
})
