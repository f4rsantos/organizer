import * as Y from 'yjs'
import { adoptCollaborativeTitle, createNoteDoc, decodeNoteDoc, encodeNoteDoc } from './yDoc'

export const CANVAS_STROKES_FIELD = 'strokes'
const LOCAL_ORIGIN = 'canvas-local'

export function strokeArray(ydoc) {
  return ydoc.getArray(CANVAS_STROKES_FIELD)
}

export function readStrokes(ydoc) {
  return strokeArray(ydoc).toArray()
}

export function planStrokeSync(current, next, makeId) {
  const currentById = new Map(current.map(stroke => [stroke.id, stroke]))
  const kept = new Set()
  const replace = new Map()
  const append = []
  for (const stroke of next) {
    const known = stroke?.id && currentById.has(stroke.id) && !kept.has(stroke.id) && !replace.has(stroke.id)
    if (known && currentById.get(stroke.id) === stroke) { kept.add(stroke.id); continue }
    if (known) { replace.set(stroke.id, stroke); continue }
    append.push({ ...stroke, id: makeId() })
  }
  const deleteIds = new Set(current.map(stroke => stroke.id).filter(id => !kept.has(id) && !replace.has(id)))
  return { deleteIds, replace, append }
}

export function writeStrokes(ydoc, next, makeId, origin = null) {
  const array = strokeArray(ydoc)
  const { deleteIds, replace, append } = planStrokeSync(array.toArray(), next, makeId)
  if (!deleteIds.size && !replace.size && !append.length) return false
  ydoc.transact(() => {
    const current = array.toArray()
    for (let index = current.length - 1; index >= 0; index--) {
      const id = current[index].id
      if (deleteIds.has(id)) array.delete(index, 1)
      else if (replace.has(id)) {
        array.delete(index, 1)
        array.insert(index, [replace.get(id)])
      }
    }
    if (append.length) array.push(append)
  }, origin)
  return true
}

export function storedDocFromStrokes(strokes, title, makeId) {
  const ydoc = createNoteDoc()
  writeStrokes(ydoc, strokes, makeId)
  adoptCollaborativeTitle(ydoc, title ?? '')
  const stored = encodeNoteDoc(ydoc)
  ydoc.destroy()
  return stored
}

export function strokesFromStoredDoc(stored) {
  const ydoc = decodeNoteDoc(stored)
  const strokes = readStrokes(ydoc)
  ydoc.destroy()
  return strokes
}

export function createSharedCanvas(ydoc, makeId) {
  const array = strokeArray(ydoc)
  const undoManager = new Y.UndoManager(array, { trackedOrigins: new Set([LOCAL_ORIGIN]) })
  return {
    read: () => array.toArray(),
    write: next => writeStrokes(ydoc, next, makeId, LOCAL_ORIGIN),
    observe: listener => {
      const handler = () => listener(array.toArray())
      array.observe(handler)
      return () => array.unobserve(handler)
    },
    undo: () => undoManager.undo(),
    redo: () => undoManager.redo(),
    canUndo: () => undoManager.undoStack.length > 0,
    canRedo: () => undoManager.redoStack.length > 0,
    onHistoryChange: listener => {
      undoManager.on('stack-item-added', listener)
      undoManager.on('stack-item-popped', listener)
      return () => {
        undoManager.off('stack-item-added', listener)
        undoManager.off('stack-item-popped', listener)
      }
    },
    destroy: () => undoManager.destroy(),
  }
}
