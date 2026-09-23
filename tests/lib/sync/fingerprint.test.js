import { describe, it, expect } from 'vitest'
import { fingerprintState, hashValue, stableStringify } from '../../../src/lib/sync/fingerprint.js'

describe('stableStringify', () => {
  it('ignores key order', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 2 }, b: 1 }))
  })

  it('drops undefined keys the way JSON does', () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }))
  })

  it('matches a JSON round trip of the same value', () => {
    const task = { id: 't1', title: 'Read', done: false, dueDate: null, tags: ['a', undefined] }
    expect(hashValue(task)).toBe(hashValue(JSON.parse(JSON.stringify(task))))
  })
})

describe('hashValue', () => {
  it('changes when any field changes', () => {
    expect(hashValue({ id: 't1', done: false })).not.toBe(hashValue({ id: 't1', done: true }))
  })

  it('stays short regardless of content size', () => {
    expect(hashValue({ id: 't1', body: 'x'.repeat(10000) }).length).toBeLessThanOrEqual(7)
  })
})

describe('fingerprintState', () => {
  it('keys list slices by item id', () => {
    const fingerprints = fingerprintState({ tasks: [{ id: 't1' }, { id: 't2' }, { title: 'no id' }] })
    expect(Object.keys(fingerprints.tasks)).toEqual(['t1', 't2'])
  })

  it('descends into grades per semester and class', () => {
    const fingerprints = fingerprintState({ grades: { sem1: { c1: { components: [] }, c2: { components: [] } } } })
    expect(Object.keys(fingerprints.grades.sem1)).toEqual(['c1', 'c2'])
    expect(typeof fingerprints.grades.sem1.c1).toBe('string')
  })

  it('hashes value slices whole', () => {
    expect(typeof fingerprintState({ activeSemesterId: 'sem1' }).activeSemesterId).toBe('string')
  })

  it('skips absent slices and slices that are never merged', () => {
    const fingerprints = fingerprintState({ settings: { a: 1 }, tasks: [] })
    expect(Object.keys(fingerprints)).toEqual(['tasks'])
  })
})
