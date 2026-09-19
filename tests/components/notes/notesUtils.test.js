import { describe, it, expect } from 'vitest'
import { noteHasContent } from '../../../src/components/notes/notesUtils'

describe('noteHasContent', () => {
  it('is false for a fresh empty note', () => {
    expect(noteHasContent({ body: '', strokes: [] })).toBe(false)
  })

  it('is false for whitespace-only body', () => {
    expect(noteHasContent({ body: '   \n', strokes: [] })).toBe(false)
  })

  it('is true once text body has content', () => {
    expect(noteHasContent({ body: 'hello', strokes: [] })).toBe(true)
  })

  it('is true once a stroke has been drawn', () => {
    expect(noteHasContent({ body: '', strokes: [{ points: [[0, 0]] }] })).toBe(true)
  })

  it('handles missing fields defensively', () => {
    expect(noteHasContent({})).toBe(false)
    expect(noteHasContent(null)).toBe(false)
  })
})
