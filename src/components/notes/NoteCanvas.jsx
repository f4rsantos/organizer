import { useEffect, useRef, useState } from 'react'
import { Pencil, Eraser } from 'lucide-react'
import { useStore } from '@/store/useStore'

const INK = 'ink'
const COLORS = ['#6366f1', '#ef4444', '#22c55e', '#eab308', INK]
const SIZES = [2, 4, 6, 10, 16]
const DEFAULT_COLOR = COLORS[0]
const DEFAULT_WIDTH = SIZES[0]

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
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
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

export function NoteCanvas({ note }) {
  const updateNote = useStore(s => s.updateNote)
  const canvasRef = useRef(null)
  const strokesRef = useRef(note.strokes ?? [])
  const drawingRef = useRef(null)
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [width, setWidth] = useState(DEFAULT_WIDTH)

  useEffect(() => {
    strokesRef.current = note.strokes ?? []
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) draw(ctx, strokesRef.current)
  }, [note.id, note.strokes])

  const pos = e => {
    const c = canvasRef.current
    const rect = c.getBoundingClientRect()
    const sx = c.width / rect.width
    const sy = c.height / rect.height
    return [Math.round((e.clientX - rect.left) * sx), Math.round((e.clientY - rect.top) * sy)]
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

  const toolBtn = 'flex h-8 w-8 items-center justify-center rounded-md border transition-colors'

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
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
      </div>
      <canvas ref={canvasRef} width={600} height={400}
        className="w-full rounded-lg border border-border bg-background touch-none"
        onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
    </div>
  )
}
