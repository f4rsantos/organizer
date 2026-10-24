import { LassoSelect, Pen, PenLine, Highlighter, Eraser } from 'lucide-react'
import { INK } from '@/lib/notes/canvasRender'
import { readJson, writeJson } from '@/lib/safeStorage'

export const PEN_TOOLS = ['pen1', 'pen2', 'highlighter']

export const CANVAS_TOOLS = [
  { id: 'select', icon: LassoSelect, labelKey: 'canvasSelect', key: 'v' },
  { id: 'pen1', icon: Pen, labelKey: 'canvasPen', key: 'p' },
  { id: 'pen2', icon: PenLine, labelKey: 'canvasPen2', key: 'b' },
  { id: 'highlighter', icon: Highlighter, labelKey: 'canvasHighlighter', key: 'h' },
  { id: 'eraser', icon: Eraser, labelKey: 'canvasEraser', key: 'e' },
]

export const MENU_TOOLS = [...PEN_TOOLS, 'eraser']
export const ERASER_MODES = ['partial', 'stroke']
export const ERASER_SIZES = [4, 8, 12, 18, 26]

export const CANVAS_PALETTE = [
  INK, '#6b7280', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
]
export const CANVAS_SIZES = [1.5, 3, 5, 8, 12]
export const HIGHLIGHTER_OPACITY = 0.35
export const HIGHLIGHTER_WIDTH_SCALE = 4
export const MIN_POINT_DISTANCE = 1.2
export const HOLD_TO_SHAPE_MS = 1500
export const HOLD_SLOP_PX = 6
export const ZOOM_STEP = 1.25
export const FIT_MARGIN = 24

const PENS_STORAGE_KEY = 'organizer:canvasPens'
const SHAPES_STORAGE_KEY = 'organizer:canvasInkToShape'
const ERASER_STORAGE_KEY = 'organizer:canvasEraser'

const DEFAULT_PENS = {
  pen1: { color: INK, width: 3 },
  pen2: { color: '#ef4444', width: 3 },
  highlighter: { color: '#eab308', width: 5 },
}

function validPen(pen, fallback) {
  return {
    color: typeof pen?.color === 'string' ? pen.color : fallback.color,
    width: Number.isFinite(pen?.width) && pen.width > 0 ? pen.width : fallback.width,
  }
}

export function loadPens() {
  const stored = readJson(PENS_STORAGE_KEY, {})
  return Object.fromEntries(PEN_TOOLS.map(id => [id, validPen(stored?.[id], DEFAULT_PENS[id])]))
}

export function savePens(pens) {
  writeJson(PENS_STORAGE_KEY, pens)
}

const DEFAULT_ERASER = { mode: 'partial', radius: 12 }

export function loadEraser() {
  const stored = readJson(ERASER_STORAGE_KEY, {})
  return {
    mode: ERASER_MODES.includes(stored?.mode) ? stored.mode : DEFAULT_ERASER.mode,
    radius: ERASER_SIZES.includes(stored?.radius) ? stored.radius : DEFAULT_ERASER.radius,
  }
}

export function saveEraser(eraser) {
  writeJson(ERASER_STORAGE_KEY, eraser)
}

export function loadInkToShape() {
  return readJson(SHAPES_STORAGE_KEY, true) !== false
}

export function saveInkToShape(value) {
  writeJson(SHAPES_STORAGE_KEY, value)
}
