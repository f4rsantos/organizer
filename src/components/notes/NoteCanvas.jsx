import { useEffect, useRef, useState } from 'react'
import { Pencil, Eraser, Plus, Minus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'

const INK = 'ink'
const COLORS = ['#6366f1', '#ef4444', '#22c55e', '#eab308', INK]
const SIZES = [2, 4, 6, 10, 16]
const DEFAULT_COLOR = COLORS[0]
const DEFAULT_WIDTH = SIZES[0]
const LOGICAL_WIDTH = 600
const MAX_DPR = 3
const PAGE_RATIO = 1.4
const MAX_PAGES = 12

function normalize(stroke) {
  if (Array.isArray(stroke)) return { color: DEFAULT_COLOR, width: DEFAULT_WIDTH, points: stroke }
  return stroke
}

function resolveColor(canvas, color) {
  if (color !== INK) return color
  const v = getComputedStyle(canvas).getPropertyValue('--foreground').trim()
  return v || '#111827'
}

function draw(ctx, strokes) {
  const scale = ctx.getTransform().a || 1
  ctx.clearRect(0, 0, ctx.canvas.width / scale, ctx.canvas.height / scale)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const raw of strokes) {
    const s = normalize(raw)
    ctx.strokeStyle = resolveColor(ctx.canvas, s.color)
    ctx.lineWidth = s.width
    ctx.beginPath()
    s.points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
    ctx.stroke()
  }
}

function hitStroke(raw, x, y, radius) {
  const s = normalize(raw)
  const r = radius + s.width / 2
  return s.points.some(p => Math.hypot(p[0] - x, p[1] - y) <= r)
}

function lowestPageUsed(strokes) {
  let maxY = 0
  for (const raw of strokes) {
    for (const p of normalize(raw).points) if (p[1] > maxY) maxY = p[1]
  }
  return Math.ceil(maxY / (LOGICAL_WIDTH * PAGE_RATIO)) || 1
}

export function NoteCanvas({ note }) {
  const updateNote = useStore(s => s.updateNote)
  const t = useStrings(useStore(s => s.lang ?? 'en'))
  const canvasRef = useRef(null)
  const strokesRef = useRef(note.strokes ?? [])
  const drawingRef = useRef(null)
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [width, setWidth] = useState(DEFAULT_WIDTH)

  const pages = Math.max(1, Math.min(MAX_PAGES, note.canvasPages ?? 1))

  const resize = () => {
    const c = canvasRef.current
    if (!c) return
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    const w = Math.round(c.clientWidth * dpr)
    const h = Math.round(c.clientHeight * dpr)
    if (!w || !h) return
    if (c.width !== w) c.width = w
    if (c.height !== h) c.height = h
    const ctx = c.getContext('2d')
    const scale = w / LOGICAL_WIDTH
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    draw(ctx, strokesRef.current)
  }

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return undefined
    const ro = new ResizeObserver(() => resize())
    ro.observe(c)
    resize()
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    strokesRef.current = note.strokes ?? []
    resize()
  }, [note.id, note.strokes, pages])

  const pos = e => {
    const c = canvasRef.current
    const rect = c.getBoundingClientRect()
    const s = LOGICAL_WIDTH / rect.width
    return [Math.round((e.clientX - rect.left) * s), Math.round((e.clientY - rect.top) * s)]
  }

  const erase = (x, y) => {
    const next = strokesRef.current.filter(s => !hitStroke(s, x, y, width))
    if (next.length === strokesRef.current.length) return
    strokesRef.current = next
    draw(canvasRef.current.getContext('2d'), next)
  }

  const start = e => {
    const [x, y] = pos(e)
    if (tool === 'eraser') { drawingRef.current = 'erasing'; erase(x, y); return }
    drawingRef.current = { color, width, points: [[x, y]] }
  }
  const move = e => {
    if (!drawingRef.current) return
    const [x, y] = pos(e)
    if (tool === 'eraser') { erase(x, y); return }
    drawingRef.current.points.push([x, y])
    draw(canvasRef.current.getContext('2d'), [...strokesRef.current, drawingRef.current])
  }
  const end = () => {
    if (!drawingRef.current) return
    if (tool === 'eraser') { drawingRef.current = null; updateNote(note.id, { strokes: strokesRef.current }); return }
    strokesRef.current = [...strokesRef.current, drawingRef.current]
    drawingRef.current = null
    updateNote(note.id, { strokes: strokesRef.current })
  }

  const addPage = () => updateNote(note.id, { canvasPages: Math.min(MAX_PAGES, pages + 1) })
  const removePage = () => {
    const next = Math.max(1, pages - 1)
    if (next < lowestPageUsed(note.strokes ?? [])) return
    updateNote(note.id, { canvasPages: next })
  }

  const usedPages = lowestPageUsed(note.strokes ?? [])
  const canRemove = pages > 1 && pages - 1 >= usedPages
  const toolBtn = 'flex h-8 w-8 items-center justify-center rounded-md border transition-colors'

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setTool('pen')}
            className={`${toolBtn} ${tool === 'pen' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-muted'}`}>
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setTool('eraser')}
            className={`${toolBtn} ${tool === 'eraser' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-muted'}`}>
            <Eraser className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => { setColor(c); setTool('pen') }}
              style={c === INK ? undefined : { backgroundColor: c }}
              className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${c === INK ? 'bg-foreground' : ''} ${color === c && tool === 'pen' ? 'border-primary scale-110' : 'border-transparent'}`} />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {SIZES.map(s => (
            <button key={s} type="button" onClick={() => setWidth(s)}
              className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${width === s ? 'border-primary bg-muted' : 'border-transparent hover:bg-muted'}`}>
              <span className="rounded-full bg-foreground" style={{ width: s, height: s }} />
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={removePage} disabled={!canRemove}
            title={t.canvasRemovePage}
            className={`${toolBtn} border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none`}>
            <Minus className="h-4 w-4" />
          </button>
          <span className="text-xs tabular-nums text-muted-foreground">{pages}</span>
          <button type="button" onClick={addPage} disabled={pages >= MAX_PAGES}
            title={t.canvasAddPage}
            className={`${toolBtn} border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none`}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="scroll-pane min-h-0 flex-1 rounded-lg border border-border">
        <canvas ref={canvasRef}
          style={{ touchAction: 'none', aspectRatio: `${LOGICAL_WIDTH} / ${LOGICAL_WIDTH * PAGE_RATIO * pages}` }}
          className="block w-full bg-background touch-none"
          onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
      </div>
    </div>
  )
}
