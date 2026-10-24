import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import { createSharedCanvas, planStrokeSync, readStrokes, writeStrokes, strokesFromStoredDoc, storedDocFromStrokes } from '../../../src/lib/notes/canvasYDoc.js'

function sequentialIds(prefix = 's') {
  let n = 0
  return () => `${prefix}${++n}`
}

const stroke = (x, extra = {}) => ({ color: '#000', width: 2, points: [[x, 0], [x + 10, 0]], ...extra })

function sync(a, b) {
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a))
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b))
}

describe('planStrokeSync', () => {
  it('keeps untouched strokes and appends new ones with fresh ids', () => {
    const current = [stroke(0, { id: 'a' })]
    const plan = planStrokeSync(current, [current[0], stroke(20)], sequentialIds())
    expect(plan.deleteIds).toEqual(new Set())
    expect(plan.append).toEqual([stroke(20, { id: 's1' })])
  })

  it('updates a moved stroke in place so it keeps its id and layer', () => {
    const current = [stroke(0, { id: 'a' }), stroke(50, { id: 'b' })]
    const moved = { ...current[0], points: [[5, 5], [15, 5]] }
    const plan = planStrokeSync(current, [moved, current[1]], sequentialIds())
    expect(plan.deleteIds).toEqual(new Set())
    expect(plan.replace.get('a')).toBe(moved)
    expect(plan.append).toEqual([])
  })

  it('keeps the first eraser piece in place and adds the rest with fresh ids', () => {
    const current = [stroke(0, { id: 'a' })]
    const pieces = [{ ...current[0], points: [[0, 0], [2, 0]] }, { ...current[0], points: [[8, 0], [10, 0]] }]
    const plan = planStrokeSync(current, pieces, sequentialIds())
    expect(plan.replace.get('a')).toBe(pieces[0])
    expect(plan.append.map(s => s.id)).toEqual(['s1'])
  })

  it('deletes strokes that are no longer in the drawing', () => {
    const current = [stroke(0, { id: 'a' }), stroke(50, { id: 'b' })]
    expect(planStrokeSync(current, [current[1]], sequentialIds()).deleteIds).toEqual(new Set(['a']))
  })
})

describe('shared drawing document', () => {
  it('merges strokes drawn at the same time on two devices', () => {
    const a = new Y.Doc()
    const b = new Y.Doc()
    writeStrokes(a, [stroke(0)], sequentialIds('a'))
    sync(a, b)
    writeStrokes(a, [...readStrokes(a), stroke(20)], sequentialIds('a2-'))
    writeStrokes(b, [...readStrokes(b), stroke(40)], sequentialIds('b'))
    sync(a, b)
    expect(readStrokes(a).map(s => s.points[0][0]).sort((x, y) => x - y)).toEqual([0, 20, 40])
    expect(readStrokes(b)).toEqual(readStrokes(a))
  })

  it('removes an erased stroke on the other device without touching its new strokes', () => {
    const a = new Y.Doc()
    const b = new Y.Doc()
    writeStrokes(a, [stroke(0), stroke(20)], sequentialIds('a'))
    sync(a, b)
    writeStrokes(a, [readStrokes(a)[1]], sequentialIds('a2-'))
    writeStrokes(b, [...readStrokes(b), stroke(40)], sequentialIds('b'))
    sync(a, b)
    expect(readStrokes(b).map(s => s.points[0][0])).toEqual([20, 40])
  })

  it('moves a stroke for everyone without changing its order', () => {
    const a = new Y.Doc()
    const b = new Y.Doc()
    writeStrokes(a, [stroke(0), stroke(20)], sequentialIds('a'))
    sync(a, b)
    const [first, second] = readStrokes(a)
    writeStrokes(a, [{ ...first, points: [[100, 0], [110, 0]] }, second], sequentialIds('a2-'))
    sync(a, b)
    expect(readStrokes(b).map(s => s.points[0][0])).toEqual([100, 20])
    expect(readStrokes(b)[0].id).toBe(first.id)
  })

  it('round trips a drawing through the stored shared note state', () => {
    const stored = storedDocFromStrokes([stroke(0), stroke(30)], 'Sketch', sequentialIds())
    expect(strokesFromStoredDoc(stored).map(s => s.points[0][0])).toEqual([0, 30])
  })
})

describe('createSharedCanvas', () => {
  it('undoes only your own strokes, never a teammate drawing at the same time', () => {
    const a = new Y.Doc()
    const b = new Y.Doc()
    const mine = createSharedCanvas(a, sequentialIds('a'))
    const theirs = createSharedCanvas(b, sequentialIds('b'))
    mine.write([stroke(0)])
    sync(a, b)
    theirs.write([...theirs.read(), stroke(50)])
    sync(a, b)
    mine.undo()
    sync(a, b)
    expect(theirs.read().map(s => s.points[0][0])).toEqual([50])
    mine.destroy()
    theirs.destroy()
  })

  it('tells the drawing when a teammate changes it', () => {
    const a = new Y.Doc()
    const b = new Y.Doc()
    const mine = createSharedCanvas(a, sequentialIds('a'))
    const seen = []
    const stop = mine.observe(strokes => seen.push(strokes.length))
    const theirs = createSharedCanvas(b, sequentialIds('b'))
    theirs.write([stroke(10)])
    sync(a, b)
    expect(seen).toEqual([1])
    stop()
    mine.destroy()
    theirs.destroy()
  })
})
