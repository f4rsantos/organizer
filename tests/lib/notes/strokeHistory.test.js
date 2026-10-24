import { describe, it, expect } from 'vitest'
import { EMPTY_HISTORY, recordHistory, undoHistory, redoHistory } from '../../../src/lib/notes/strokeHistory.js'

const a = [{ points: [[0, 0]] }]
const b = [...a, { points: [[1, 1]] }]
const c = [...b, { points: [[2, 2]] }]

describe('stroke history', () => {
  it('undoes back to the previous drawing and redoes forward again', () => {
    const history = recordHistory(recordHistory(EMPTY_HISTORY, a), b)
    const undone = undoHistory(history, c)
    expect(undone.strokes).toBe(b)
    const redone = redoHistory(undone.history, undone.strokes)
    expect(redone.strokes).toBe(c)
  })

  it('drops the redo branch once a new stroke is drawn', () => {
    const { history } = undoHistory(recordHistory(EMPTY_HISTORY, a), b)
    expect(recordHistory(history, a).redo).toEqual([])
  })

  it('returns nothing to apply when there is nothing to undo or redo', () => {
    expect(undoHistory(EMPTY_HISTORY, a)).toBeNull()
    expect(redoHistory(EMPTY_HISTORY, a)).toBeNull()
  })

  it('forgets the oldest steps past the limit', () => {
    let history = EMPTY_HISTORY
    for (let i = 0; i < 150; i++) history = recordHistory(history, [i])
    expect(history.undo).toHaveLength(100)
    expect(history.undo[0]).toEqual([50])
  })
})
