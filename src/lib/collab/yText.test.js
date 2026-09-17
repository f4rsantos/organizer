import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import { diffText, applyTextDiff } from './yText'

describe('diffText', () => {
  it('returns null when unchanged', () => {
    expect(diffText('Physics notes', 'Physics notes')).toBeNull()
  })

  it('describes an append', () => {
    expect(diffText('Physics', 'Physics II')).toEqual({ index: 7, deleteLength: 0, insert: ' II' })
  })

  it('describes a prepend', () => {
    expect(diffText('notes', 'my notes')).toEqual({ index: 0, deleteLength: 0, insert: 'my ' })
  })

  it('describes a middle replacement', () => {
    expect(diffText('Physics 101', 'Physics 202')).toEqual({ index: 8, deleteLength: 3, insert: '202' })
  })

  it('describes a deletion', () => {
    expect(diffText('Physics notes', 'Physics')).toEqual({ index: 7, deleteLength: 6, insert: '' })
  })

  it('handles clearing the whole string', () => {
    expect(diffText('Physics', '')).toEqual({ index: 0, deleteLength: 7, insert: '' })
  })

  it('does not overlap prefix and suffix on repeated characters', () => {
    const patch = diffText('aaa', 'aa')
    expect(patch.deleteLength).toBe(1)
    expect(patch.insert).toBe('')
  })
})

describe('applyTextDiff', () => {
  const textOf = doc => doc.getText('title')

  it('applies an edit to the ytext', () => {
    const doc = new Y.Doc()
    textOf(doc).insert(0, 'Physics')
    applyTextDiff(textOf(doc), 'Physics II')
    expect(textOf(doc).toString()).toBe('Physics II')
  })

  it('reports no change when the text already matches', () => {
    const doc = new Y.Doc()
    textOf(doc).insert(0, 'Physics')
    expect(applyTextDiff(textOf(doc), 'Physics')).toBe(false)
  })

  it('treats a nullish value as empty', () => {
    const doc = new Y.Doc()
    textOf(doc).insert(0, 'Physics')
    applyTextDiff(textOf(doc), null)
    expect(textOf(doc).toString()).toBe('')
  })

  it('merges concurrent edits at different offsets', () => {
    const alice = new Y.Doc()
    alice.getText('title').insert(0, 'Physics 101')
    const bob = new Y.Doc()
    Y.applyUpdate(bob, Y.encodeStateAsUpdate(alice))

    applyTextDiff(alice.getText('title'), 'Advanced Physics 101')
    applyTextDiff(bob.getText('title'), 'Physics 101 notes')

    const aliceUpdate = Y.encodeStateAsUpdate(alice)
    const bobUpdate = Y.encodeStateAsUpdate(bob)
    Y.applyUpdate(alice, bobUpdate)
    Y.applyUpdate(bob, aliceUpdate)

    expect(alice.getText('title').toString()).toBe('Advanced Physics 101 notes')
    expect(bob.getText('title').toString()).toBe('Advanced Physics 101 notes')
  })
})
