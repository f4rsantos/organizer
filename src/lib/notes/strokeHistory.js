const HISTORY_LIMIT = 100

export const EMPTY_HISTORY = { undo: [], redo: [] }

export function recordHistory(history, previous) {
  return { undo: [...history.undo, previous].slice(-HISTORY_LIMIT), redo: [] }
}

export function undoHistory(history, current) {
  if (!history.undo.length) return null
  return {
    strokes: history.undo[history.undo.length - 1],
    history: { undo: history.undo.slice(0, -1), redo: [...history.redo, current] },
  }
}

export function redoHistory(history, current) {
  if (!history.redo.length) return null
  return {
    strokes: history.redo[history.redo.length - 1],
    history: { undo: [...history.undo, current], redo: history.redo.slice(0, -1) },
  }
}
