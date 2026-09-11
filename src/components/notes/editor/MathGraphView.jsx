import { useMemo, useRef, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts'
import { AlignRight, Pencil, Check, WrapText, RectangleHorizontal, GripHorizontal } from 'lucide-react'
import { sampleExpression } from '@/lib/notes/mathTrigger'
import { parse, containsVariable } from '@/lib/notes/expression'
import { useMeasuredWidth } from '@/hooks/useMeasuredWidth'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'

const AXIS_STYLE = { fontSize: 10, fill: 'currentColor' }
const MIN_HEIGHT = 100
const MAX_HEIGHT = 480
const MIN_WIDTH = 200
const MAX_WIDTH = 1200
const DEFAULT_WIDTH_CSS = 'min(100%, 34rem)'
const FLOAT_WIDTH_CSS = 'min(55%, 22rem)'
const MIN_OFFSET = -800
const MAX_OFFSET = 800
const BOX_PADDING = '0.75rem'
const TEXT_GUTTER_BESIDE_BOX = `calc(1rem - ${BOX_PADDING})`
const BOX_EDGE_INSET = '0.5rem'

const ALIGNMENTS = [
  { value: 'left', className: 'mr-auto' },
  { value: 'center', className: 'mx-auto' },
  { value: 'right', className: 'ml-auto' },
]

const FLOATS = [
  { value: 'left', icon: WrapText, labelKey: 'notesGraphWrapLeft' },
  { value: 'right', icon: AlignRight, labelKey: 'notesGraphWrapRight' },
  { value: 'none', icon: RectangleHorizontal, labelKey: 'notesGraphFullWidth' },
]

const clampOffset = value => Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, Math.round(value)))

function isPlottable(source) {
  const ast = parse(source)
  return Boolean(ast && containsVariable(ast))
}

export function MathGraphView({ node, updateAttributes, selected }) {
  const { expression, xMin, xMax, height, graphWidth, align, float, offsetX } = node.attrs
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const [wrapRef, width] = useMeasuredWidth(200)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ expression, xMin, xMax })
  const resizeRef = useRef(null)
  const dragRef = useRef(null)

  const data = useMemo(
    () => sampleExpression(expression, { from: xMin, to: xMax }),
    [expression, xMin, xMax],
  )

  const floating = float === 'left' || float === 'right'
  const showTools = selected || editing
  const alignment = ALIGNMENTS.find(a => a.value === align) ?? ALIGNMENTS[1]

  const boxWidth = graphWidth
    ? `min(100%, ${graphWidth}px)`
    : (floating ? FLOAT_WIDTH_CSS : DEFAULT_WIDTH_CSS)

  const containerStyle = floating
    ? { width: '100%' }
    : { width: boxWidth, transform: offsetX ? `translateX(${offsetX}px)` : undefined }

  const wrapperStyle = floating
    ? {
        float,
        width: boxWidth,
        maxWidth: `calc(100% - ${BOX_EDGE_INSET})`,
        marginBottom: BOX_EDGE_INSET,
        marginRight: float === 'left' ? TEXT_GUTTER_BESIDE_BOX : BOX_EDGE_INSET,
        marginLeft: float === 'right' ? TEXT_GUTTER_BESIDE_BOX : BOX_EDGE_INSET,
        transform: offsetX ? `translateX(${offsetX}px)` : undefined,
      }
    : undefined

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

  const startResize = axis => event => {
    event.preventDefault()
    resizeRef.current = {
      axis,
      startX: event.clientX,
      startY: event.clientY,
      startHeight: height,
      startWidth: graphWidth || width,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveResize = event => {
    const state = resizeRef.current
    if (!state) return
    const patch = {}
    if (state.axis !== 'x') {
      const nextHeight = state.startHeight + (event.clientY - state.startY)
      patch.height = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(nextHeight)))
    }
    if (state.axis !== 'y') {
      const nextWidth = state.startWidth + (event.clientX - state.startX)
      patch.graphWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(nextWidth)))
    }
    updateAttributes(patch)
  }

  const endResize = event => {
    resizeRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const startDrag = event => {
    event.preventDefault()
    dragRef.current = { startX: event.clientX, startOffset: offsetX }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveDrag = event => {
    const state = dragRef.current
    if (!state) return
    updateAttributes({ offsetX: clampOffset(state.startOffset + (event.clientX - state.startX)) })
  }

  const endDrag = event => {
    dragRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  return (
    <NodeViewWrapper className="my-3" style={wrapperStyle}
      data-math-graph="" data-x-min={xMin} data-x-max={xMax} data-align={align}
      data-float={float} data-offset-x={offsetX}>
      <div className={cn(
        'w-full max-w-full rounded-xl p-3 transition-colors',
        selected && 'ring-1 ring-primary/40',
        !floating && alignment.className,
      )} style={containerStyle}>
        <div className="mb-1 flex min-h-6 items-center gap-1">
          {editing ? (
            <input autoFocus value={draft.expression} spellCheck={false}
              className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs outline-none focus:ring-1 focus:ring-primary/40"
              onChange={e => setDraft(d => ({ ...d, expression: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }} />
          ) : (
            <p className="flex-1 truncate font-mono text-xs text-muted-foreground">y = {expression}</p>
          )}

          {showTools && (
            <>
              {FLOATS.map(option => (
                <button key={option.value} type="button" title={t[option.labelKey]}
                  className={cn('rounded p-1 text-muted-foreground/60 hover:text-foreground',
                    float === option.value && 'bg-primary/15 text-primary')}
                  onClick={() => updateAttributes({ float: option.value, offsetX: 0 })}>
                  <option.icon className={cn('h-3 w-3', option.value === 'right' && 'scale-x-[-1]')} />
                </button>
              ))}

              <button type="button" title={editing ? t.save : t.notesGraphEdit}
                className="rounded p-1 text-muted-foreground/60 hover:text-foreground"
                onClick={() => (editing ? commit() : (setDraft({ expression, xMin, xMax }), setEditing(true)))}>
                {editing ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
              </button>
              <span role="separator" aria-label={t.notesGraphMove} title={t.notesGraphMove}
                className="rounded p-1 text-muted-foreground/60 touch-none hover:text-foreground cursor-ew-resize"
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}>
                <GripHorizontal className="h-3 w-3" />
              </span>
            </>
          )}
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

        <div className={cn('mt-1 flex items-center gap-2 transition-opacity',
          showTools ? 'opacity-100' : 'pointer-events-none opacity-0')}>
          <div role="separator" aria-label={t.notesGraphResize}
            className="mx-auto h-1.5 w-16 cursor-ns-resize rounded-full bg-border touch-none hover:bg-muted-foreground/50"
            onPointerDown={startResize('y')}
            onPointerMove={moveResize}
            onPointerUp={endResize}
            onPointerCancel={endResize} />

          <div role="separator" aria-label={t.notesGraphResizeWidth}
            className="h-1.5 w-1.5 shrink-0 cursor-nwse-resize rounded-full bg-border touch-none ring-2 ring-transparent hover:bg-muted-foreground/50"
            onPointerDown={startResize('both')}
            onPointerMove={moveResize}
            onPointerUp={endResize}
            onPointerCancel={endResize} />
        </div>
      </div>
    </NodeViewWrapper>
  )
}
