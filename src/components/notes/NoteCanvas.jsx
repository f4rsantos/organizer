import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'
import { useStrings } from '@/lib/strings'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { boundsOfStrokes } from '@/lib/notes/canvasGeometry'
import { EMPTY_HISTORY, recordHistory, redoHistory, undoHistory } from '@/lib/notes/strokeHistory'
import { DEFAULT_VIEWPORT, fitViewport, panBy, zoomAround } from '@/lib/notes/canvasViewport'
import { applyView, clearCanvas, drawScene, resolveInk } from '@/lib/notes/canvasRender'
import { CanvasToolbar } from './canvas/CanvasToolbar'
import { ZoomControls } from './canvas/ZoomControls'
import { useWhiteboardInput } from './canvas/useWhiteboardInput'
import {
  CANVAS_TOOLS, FIT_MARGIN, MENU_TOOLS, ZOOM_STEP,
  loadEraser, loadInkToShape, loadPens, saveEraser, saveInkToShape, savePens,
} from './canvas/canvasTools'

const MAX_PIXEL_RATIO = 3
const WHEEL_ZOOM_SPEED = 0.01
const NO_SELECTION = new Set()
const EMPTY_STROKES = []

function pixelRatio() {
  return Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function selectedBounds(strokes, selection) {
  if (!selection.size) return null
  return boundsOfStrokes(strokes.filter((_, index) => selection.has(index)))
}

function initialView(strokes, size) {
  const bounds = boundsOfStrokes(strokes)
  return bounds ? fitViewport(bounds, size, FIT_MARGIN) : DEFAULT_VIEWPORT
}

function CanvasBoard({ strokes, paper, onChange, history, readOnly = false }) {
  const t = useStrings(useStore(s => s.lang ?? 'en'))
  const surfaceRef = useRef(null)
  const baseRef = useRef(null)
  const liveRef = useRef(null)
  const strokesRef = useRef(strokes)
  const viewRef = useRef(DEFAULT_VIEWPORT)
  const sizeRef = useRef(null)
  const spaceHeldRef = useRef(false)
  const selectionBoundsRef = useRef(null)
  const [view, setViewState] = useState(DEFAULT_VIEWPORT)
  const [size, setSize] = useState(null)
  const [tool, setTool] = useState('pen1')
  const [pens, setPens] = useState(loadPens)
  const [eraser, setEraser] = useState(loadEraser)
  const [menuOpen, setMenuOpen] = useState(false)
  const [inkToShape, setInkToShape] = useState(loadInkToShape)
  const [selection, setSelection] = useState(NO_SELECTION)
  const [stylusSeen, setStylusSeen] = useState(false)
  const [stylusOnly, setStylusOnly] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const setView = next => {
    viewRef.current = next
    setViewState(next)
  }

  const redraw = () => {
    const base = baseRef.current
    if (!base || !sizeRef.current) return
    selectionBoundsRef.current = selectedBounds(strokesRef.current, selection)
    drawScene(base.getContext('2d'), {
      strokes: strokesRef.current, paper, view: viewRef.current, size: sizeRef.current,
      pixelRatio: pixelRatio(), ink: resolveInk(base), selection: selectionBoundsRef.current,
    })
  }
  const redrawNow = useEffectEvent(redraw)

  const drawLive = paint => {
    const live = liveRef.current
    if (!live) return
    const ctx = live.getContext('2d')
    clearCanvas(ctx)
    applyView(ctx, viewRef.current, pixelRatio())
    ctx.save()
    paint(ctx)
    ctx.restore()
  }

  const clearLive = () => {
    const live = liveRef.current
    if (live) clearCanvas(live.getContext('2d'))
  }

  const onSurfaceResize = useEffectEvent(entry => {
    const next = { width: entry.contentRect.width, height: entry.contentRect.height }
    if (!next.width || !next.height) return
    const first = !sizeRef.current
    sizeRef.current = next
    setSize(next)
    if (first) setView(initialView(strokesRef.current, next))
  })

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return undefined
    const observer = new ResizeObserver(entries => onSurfaceResize(entries[0]))
    observer.observe(surface)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!size) return
    const ratio = pixelRatio()
    for (const canvas of [baseRef.current, liveRef.current]) {
      if (!canvas) continue
      canvas.width = Math.round(size.width * ratio)
      canvas.height = Math.round(size.height * ratio)
    }
    redrawNow()
  }, [size])

  useEffect(() => {
    strokesRef.current = strokes
    redrawNow()
  }, [strokes])

  useEffect(() => {
    redrawNow()
  }, [view, paper, selection])

  useEffect(() => {
    const observer = new MutationObserver(() => redrawNow())
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
    return () => observer.disconnect()
  }, [])

  const save = next => {
    strokesRef.current = next
    redraw()
    onChange(next)
  }

  const commit = next => {
    history.record(strokesRef.current)
    setSelection(NO_SELECTION)
    save(next)
  }

  const applyHistoryStep = restored => {
    setSelection(NO_SELECTION)
    if (restored) save(restored)
  }

  const undo = () => applyHistoryStep(history.undo(strokesRef.current))
  const redo = () => applyHistoryStep(history.redo(strokesRef.current))

  const deleteSelectionOrClear = () => {
    if (!selection.size) { setConfirmClear(true); return }
    commit(strokesRef.current.filter((_, index) => !selection.has(index)))
  }

  const chooseTool = id => {
    if (id === tool && MENU_TOOLS.includes(id)) { setMenuOpen(open => !open); return }
    setTool(id)
    setMenuOpen(false)
    if (id !== 'select') setSelection(NO_SELECTION)
  }

  const changePen = (id, pen) => {
    const next = { ...pens, [id]: pen }
    setPens(next)
    savePens(next)
  }

  const changeEraser = next => {
    setEraser(next)
    saveEraser(next)
  }

  const toggleInkToShape = () => {
    saveInkToShape(!inkToShape)
    setInkToShape(!inkToShape)
  }

  const zoomBy = factor => {
    if (!size) return
    setView(zoomAround(viewRef.current, factor, [size.width / 2, size.height / 2]))
  }

  const fitToDrawing = () => {
    if (size) setView(initialView(strokesRef.current, size))
  }

  const input = useWhiteboardInput({
    surfaceRef, viewRef, strokesRef, tool, pens, eraser, inkToShape, stylusOnly, spaceHeldRef, selectionBoundsRef,
    drawLive, clearLive,
    actions: {
      preview: next => { strokesRef.current = next; redraw() },
      commitFrom: before => {
        history.record(before)
        onChange(strokesRef.current)
        redraw()
      },
      addStroke: stroke => commit([...strokesRef.current, stroke]),
      select: setSelection,
      selection: () => selection,
      setView,
      dismissMenus: () => setMenuOpen(false),
      stylusSeen: () => {
        if (stylusSeen) return
        setStylusSeen(true)
        setStylusOnly(true)
      },
    },
  })

  const onWheel = useEffectEvent(event => {
    event.preventDefault()
    const rect = surfaceRef.current.getBoundingClientRect()
    const anchor = [event.clientX - rect.left, event.clientY - rect.top]
    if (event.ctrlKey || event.metaKey) setView(zoomAround(viewRef.current, Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED), anchor))
    else setView(panBy(viewRef.current, -event.deltaX, -event.deltaY))
  })

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return undefined
    const listener = event => onWheel(event)
    surface.addEventListener('wheel', listener, { passive: false })
    return () => surface.removeEventListener('wheel', listener)
  }, [])

  const onKeyDown = useEffectEvent(event => {
    if (readOnly || isTypingTarget(event.target)) return
    if (event.code === 'Space') { spaceHeldRef.current = true; return }
    const modifier = event.ctrlKey || event.metaKey
    if (modifier && event.code === 'KeyZ') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return }
    if (modifier && event.code === 'KeyY') { event.preventDefault(); redo(); return }
    if (modifier && event.code === 'KeyA') {
      event.preventDefault()
      setTool('select')
      setSelection(new Set(strokesRef.current.map((_, index) => index)))
      return
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && selection.size) { event.preventDefault(); deleteSelectionOrClear(); return }
    if (event.key === 'Escape') { setSelection(NO_SELECTION); setMenuOpen(false); setFullscreen(false); return }
    if (modifier || event.altKey) return
    const entry = CANVAS_TOOLS.find(candidate => candidate.key === event.key.toLowerCase())
    if (entry) chooseTool(entry.id)
  })

  const onKeyUp = useEffectEvent(event => {
    if (event.code === 'Space') spaceHeldRef.current = false
  })

  useEffect(() => {
    const down = event => onKeyDown(event)
    const up = event => onKeyUp(event)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  return (
    <div ref={surfaceRef} className={cn('isolate overflow-hidden bg-background',
      fullscreen ? 'fixed inset-0 z-[60]' : 'relative h-full min-h-[320px] rounded-lg border border-border')}>
      <canvas ref={baseRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={liveRef} {...(readOnly ? {} : input)}
        style={{ touchAction: 'none', cursor: tool === 'eraser' ? 'none' : tool === 'select' ? 'default' : 'crosshair' }}
        className="absolute inset-0 h-full w-full" />
      {!readOnly && (
        <div className="pointer-events-none absolute inset-x-2 top-[max(0.5rem,env(safe-area-inset-top))] z-20 [&>*]:pointer-events-auto">
          <CanvasToolbar t={t} tool={tool} pens={pens} eraser={eraser} menuOpen={menuOpen}
            onTool={chooseTool} onPenChange={changePen} onEraserChange={changeEraser}
            controls={{
              inkToShape, onToggleInkToShape: toggleInkToShape,
              stylusSeen, stylusOnly, onToggleStylus: () => setStylusOnly(v => !v),
              canUndo: history.canUndo, canRedo: history.canRedo, onUndo: undo, onRedo: redo,
              hasSelection: selection.size > 0, canClear: strokes.length > 0, onDelete: deleteSelectionOrClear,
            }} />
        </div>
      )}
      <ZoomControls t={t} zoom={view.zoom}
        onZoomOut={() => zoomBy(1 / ZOOM_STEP)} onZoomIn={() => zoomBy(ZOOM_STEP)}
        onReset={() => zoomBy(1 / view.zoom)} onFit={fitToDrawing}
        fullscreen={fullscreen} onToggleFullscreen={() => setFullscreen(v => !v)} />
      <ConfirmDialog open={confirmClear} onOpenChange={setConfirmClear}
        title={t.canvasClearConfirmTitle} description={t.canvasClearConfirmDesc}
        onConfirm={() => commit([])} />
    </div>
  )
}

function useLocalStrokeHistory() {
  const [history, setHistory] = useState(EMPTY_HISTORY)
  const step = result => {
    if (!result) return null
    setHistory(result.history)
    return result.strokes
  }
  return {
    canUndo: history.undo.length > 0,
    canRedo: history.redo.length > 0,
    record: previous => setHistory(h => recordHistory(h, previous)),
    undo: current => step(undoHistory(history, current)),
    redo: current => step(redoHistory(history, current)),
  }
}

function LocalCanvas({ note }) {
  const updateNote = useStore(s => s.updateNote)
  const history = useLocalStrokeHistory()
  return (
    <CanvasBoard strokes={note.strokes ?? EMPTY_STROKES} paper={note.paper} history={history}
      onChange={strokes => updateNote(note.id, { strokes })} />
  )
}

function useSharedStrokes(canvas) {
  const [strokes, setStrokes] = useState(canvas.read)
  const [undoState, setUndoState] = useState({ canUndo: false, canRedo: false })

  useEffect(() => {
    const stopStrokes = canvas.observe(setStrokes)
    const stopHistory = canvas.onHistoryChange(() => setUndoState({ canUndo: canvas.canUndo(), canRedo: canvas.canRedo() }))
    return () => {
      stopStrokes()
      stopHistory()
    }
  }, [canvas])

  const history = {
    ...undoState,
    record: () => {},
    undo: () => { canvas.undo(); return null },
    redo: () => { canvas.redo(); return null },
  }
  return { strokes, history }
}

function SharedCanvas({ note, canvas, editable }) {
  const { strokes, history } = useSharedStrokes(canvas)
  return (
    <CanvasBoard strokes={strokes} paper={note.paper} history={history}
      onChange={canvas.write} readOnly={!editable} />
  )
}

export function NoteCanvas({ note, collab = null, editable = true }) {
  if (!note.sharedMeta?.remote) return <LocalCanvas key={note.id} note={note} />
  if (!collab?.canvas) return null
  return <SharedCanvas key={note.id} note={note} canvas={collab.canvas} editable={editable} />
}
