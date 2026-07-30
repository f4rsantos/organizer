import { useMemo, useRef, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts'
import { AlignLeft, AlignCenter, AlignRight, Pencil, Check } from 'lucide-react'
import { sampleExpression } from '@/lib/notes/mathTrigger'
import { parse, containsVariable } from '@/lib/notes/expression'
import { useMeasuredWidth } from '@/hooks/useMeasuredWidth'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'

const AXIS_STYLE = { fontSize: 10, fill: 'currentColor' }
const MIN_HEIGHT = 100
const MAX_HEIGHT = 480

const ALIGNMENTS = [
  { value: 'left', icon: AlignLeft, className: 'mr-auto' },
  { value: 'center', icon: AlignCenter, className: 'mx-auto' },
  { value: 'right', icon: AlignRight, className: 'ml-auto' },
]

function isPlottable(source) {
  const ast = parse(source)
  return Boolean(ast && containsVariable(ast))
}

export function MathGraphView({ node, updateAttributes, selected }) {
  const { expression, xMin, xMax, height, align } = node.attrs
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const [wrapRef, width] = useMeasuredWidth(200)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ expression, xMin, xMax })
  const resizeRef = useRef(null)

  const data = useMemo(
    () => sampleExpression(expression, { from: xMin, to: xMax }),
    [expression, xMin, xMax],
  )

  const alignment = ALIGNMENTS.find(a => a.value === align) ?? ALIGNMENTS[1]

  const commit = () => {
    const nextMin = Number(draft.xMin)
    const nextMax = Number(draft.xMax)
    const patch = {}
    if (isPlottable(draft.expression)) patch.expression = draft.expression.trim()
    if (Number.isFinite(nextMin) && Number.isFinite(nextMax) && nextMin < nextMax) {
      patch.xMin = nextMin
      patch.xMax = nextMax
    }
    updateAttributes(patch)
    setEditing(false)
  }

  const startResize = event => {
    event.preventDefault()
    resizeRef.current = { startY: event.clientY, startHeight: height }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveResize = event => {
    const state = resizeRef.current
    if (!state) return
    const next = state.startHeight + (event.clientY - state.startY)
    updateAttributes({ height: Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(next))) })
  }

  const endResize = event => {
    resizeRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  return (
    <NodeViewWrapper className="my-3" data-math-graph="" data-x-min={xMin} data-x-max={xMax} data-align={align}>
      <div className={cn(
        'w-full max-w-full rounded-xl p-3 transition-colors',
        selected && 'ring-1 ring-primary/40',
        alignment.className,
      )} style={{ width: 'min(100%, 34rem)' }}>
        <div className="mb-1 flex items-center gap-1">
          {editing ? (
            <input autoFocus value={draft.expression} spellCheck={false}
              className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs outline-none focus:ring-1 focus:ring-primary/40"
              onChange={e => setDraft(d => ({ ...d, expression: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }} />
          ) : (
            <p className="flex-1 truncate font-mono text-xs text-muted-foreground">y = {expression}</p>
          )}

          {ALIGNMENTS.map(option => (
            <button key={option.value} type="button" title={t[`notesGraphAlign${option.value}`]}
              className={cn('rounded p-1 text-muted-foreground/60 hover:text-foreground',
                align === option.value && 'bg-primary/15 text-primary')}
              onClick={() => updateAttributes({ align: option.value })}>
              <option.icon className="h-3 w-3" />
            </button>
          ))}

          <button type="button" title={editing ? t.save : t.notesGraphEdit}
            className="rounded p-1 text-muted-foreground/60 hover:text-foreground"
            onClick={() => (editing ? commit() : (setDraft({ expression, xMin, xMax }), setEditing(true)))}>
            {editing ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
          </button>
        </div>

        {editing && (
          <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{t.notesGraphRange}</span>
            <input type="number" value={draft.xMin}
              className="h-6 w-16 rounded border border-border bg-background px-1 font-mono outline-none focus:ring-1 focus:ring-primary/40"
              onChange={e => setDraft(d => ({ ...d, xMin: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') commit() }} />
            <span>→</span>
            <input type="number" value={draft.xMax}
              className="h-6 w-16 rounded border border-border bg-background px-1 font-mono outline-none focus:ring-1 focus:ring-primary/40"
              onChange={e => setDraft(d => ({ ...d, xMax: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') commit() }} />
          </div>
        )}

        <div ref={wrapRef} className="w-full text-muted-foreground" style={{ height }}>
          {data.length > 0 ? (
            <LineChart width={width} height={height} data={data}>
              <CartesianGrid strokeOpacity={0.15} />
              <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.35} />
              <XAxis dataKey="x" tick={AXIS_STYLE} axisLine={false} tickLine={false}
                type="number" domain={[xMin, xMax]} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={34} />
              <Line type="monotone" dataKey="y" stroke="var(--primary)" strokeWidth={2}
                dot={false} isAnimationActive={false} />
            </LineChart>
          ) : (
            <p className="flex h-full items-center justify-center text-xs text-muted-foreground/60">
              {t.notesGraphInvalid}
            </p>
          )}
        </div>

        <div role="separator" aria-label={t.notesGraphResize}
          className="mx-auto mt-1 h-1.5 w-16 cursor-ns-resize rounded-full bg-border touch-none hover:bg-muted-foreground/50"
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={endResize}
          onPointerCancel={endResize} />
      </div>
    </NodeViewWrapper>
  )
}
