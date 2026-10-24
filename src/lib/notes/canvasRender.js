import { boundsOfStrokes, hasPressure, normalizeStroke, pressureWidth } from './canvasGeometry'
import { PAPER_LINE_COLOR, normalizePaper, paperDash, paperDashOffset, paperSegments } from './paper'
import { visibleWorldRect } from './canvasViewport'
import { downloadBlob, escapeHtml, printAsPdf, safeFileName } from './noteExport'

export const INK = 'ink'
export const CANVAS_PAPER_SPACING = 30

const FALLBACK_INK = '#111827'
const FALLBACK_BACKGROUND = '#ffffff'
const PAPER_DOT_WIDTH = 2
const SELECTION_COLOR = 'rgba(59, 130, 246, 0.9)'
const SELECTION_DASH = [6, 4]
const SELECTION_PAD = 6
const LASSO_COLOR = 'rgba(59, 130, 246, 0.8)'
const LASSO_DASH = [4, 4]
const EXPORT_SCALE = 2
const EXPORT_MARGIN = 24
const EMPTY_EXPORT_SIZE = 400

const boundsCache = new WeakMap()

function resolveCssColor(element, variable, fallback) {
  const value = getComputedStyle(element).getPropertyValue(variable).trim()
  return value || fallback
}

export function resolveInk(element) {
  return resolveCssColor(element, '--foreground', FALLBACK_INK)
}

export function resolveBackground(element) {
  return resolveCssColor(element, '--background', FALLBACK_BACKGROUND)
}

function strokeBounds(stroke) {
  if (typeof stroke !== 'object' || stroke === null) return boundsOfStrokes([stroke])
  if (!boundsCache.has(stroke)) boundsCache.set(stroke, boundsOfStrokes([stroke]))
  return boundsCache.get(stroke)
}

function overlaps(a, b) {
  return Boolean(a && b) && a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
}

function midpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

function tracePolyline(ctx, points) {
  ctx.beginPath()
  points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
  ctx.stroke()
}

function traceSmooth(ctx, points) {
  if (points.length < 3) return tracePolyline(ctx, points.length === 1 ? [points[0], points[0]] : points)
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length - 1; i++) {
    const mid = midpoint(points[i], points[i + 1])
    ctx.quadraticCurveTo(points[i][0], points[i][1], mid[0], mid[1])
  }
  const last = points[points.length - 1]
  ctx.lineTo(last[0], last[1])
  ctx.stroke()
}

function tracePressure(ctx, points, width) {
  if (points.length < 3) {
    ctx.lineWidth = pressureWidth(width, points[0][2])
    return tracePolyline(ctx, points.length === 1 ? [points[0], points[0]] : points)
  }
  let start = points[0]
  for (let i = 1; i < points.length - 1; i++) {
    const end = midpoint(points[i], points[i + 1])
    ctx.lineWidth = pressureWidth(width, points[i][2])
    ctx.beginPath()
    ctx.moveTo(start[0], start[1])
    ctx.quadraticCurveTo(points[i][0], points[i][1], end[0], end[1])
    ctx.stroke()
    start = end
  }
}

export function drawStroke(ctx, raw, ink) {
  const stroke = normalizeStroke(raw)
  if (!stroke.points.length) return
  ctx.save()
  ctx.globalAlpha = Number.isFinite(stroke.opacity) ? stroke.opacity : 1
  ctx.strokeStyle = stroke.color === INK ? ink : stroke.color
  ctx.lineWidth = stroke.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (stroke.shape) tracePolyline(ctx, stroke.points)
  else if (hasPressure(stroke.points)) tracePressure(ctx, stroke.points, stroke.width)
  else traceSmooth(ctx, stroke.points)
  ctx.restore()
}

function drawPaper(ctx, paper, rect, zoom) {
  const { pattern, style } = normalizePaper(paper)
  const segments = paperSegments(pattern, { ...rect, spacing: CANVAS_PAPER_SPACING })
  if (!segments.length) return
  ctx.save()
  ctx.strokeStyle = PAPER_LINE_COLOR
  ctx.lineWidth = (style === 'dotted' ? PAPER_DOT_WIDTH : 1) / zoom
  ctx.lineCap = style === 'dotted' ? 'round' : 'butt'
  ctx.setLineDash(paperDash(style, CANVAS_PAPER_SPACING))
  ctx.lineDashOffset = paperDashOffset(style, CANVAS_PAPER_SPACING)
  for (const [x1, y1, x2, y2] of segments) {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
  ctx.restore()
}

function drawSelection(ctx, bounds, zoom) {
  ctx.save()
  ctx.strokeStyle = SELECTION_COLOR
  ctx.lineWidth = 1.5 / zoom
  ctx.setLineDash(SELECTION_DASH.map(v => v / zoom))
  const pad = SELECTION_PAD / zoom
  ctx.strokeRect(bounds.minX - pad, bounds.minY - pad, bounds.maxX - bounds.minX + pad * 2, bounds.maxY - bounds.minY + pad * 2)
  ctx.restore()
}

export function applyView(ctx, view, pixelRatio) {
  const scale = view.zoom * pixelRatio
  ctx.setTransform(scale, 0, 0, scale, -view.x * scale, -view.y * scale)
}

export function clearCanvas(ctx) {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.restore()
}

export function drawScene(ctx, { strokes, paper, view, size, pixelRatio, ink, selection }) {
  clearCanvas(ctx)
  applyView(ctx, view, pixelRatio)
  const rect = visibleWorldRect(view, size)
  drawPaper(ctx, paper, rect, view.zoom)
  for (const stroke of strokes) {
    if (overlaps(strokeBounds(stroke), rect)) drawStroke(ctx, stroke, ink)
  }
  if (selection) drawSelection(ctx, selection, view.zoom)
}

export function drawLasso(ctx, points, zoom) {
  if (points.length < 2) return
  ctx.save()
  ctx.strokeStyle = LASSO_COLOR
  ctx.lineWidth = 1.5 / zoom
  ctx.setLineDash(LASSO_DASH.map(v => v / zoom))
  tracePolyline(ctx, [...points, points[0]])
  ctx.restore()
}

function exportArea(strokes) {
  const box = boundsOfStrokes(strokes)
  if (!box) return { minX: 0, minY: 0, maxX: EMPTY_EXPORT_SIZE, maxY: EMPTY_EXPORT_SIZE }
  return { minX: box.minX - EXPORT_MARGIN, minY: box.minY - EXPORT_MARGIN, maxX: box.maxX + EXPORT_MARGIN, maxY: box.maxY + EXPORT_MARGIN }
}

function renderDrawing(note, { ink, background }) {
  const strokes = note.strokes ?? []
  const area = exportArea(strokes)
  const width = area.maxX - area.minX
  const height = area.maxY - area.minY
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * EXPORT_SCALE)
  canvas.height = Math.ceil(height * EXPORT_SCALE)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const view = { x: area.minX, y: area.minY, zoom: 1 }
  applyView(ctx, view, EXPORT_SCALE)
  drawPaper(ctx, note.paper, area, 1)
  for (const stroke of strokes) drawStroke(ctx, stroke, ink)
  return canvas
}

export function exportDrawing(note, format) {
  const root = document.documentElement
  const canvas = renderDrawing(note, { ink: resolveInk(root), background: resolveBackground(root) })
  const name = safeFileName(note.title)
  if (format === 'pdf') {
    const title = escapeHtml(note.title ?? '')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>`
      + '<style>body{margin:0}img{display:block;max-width:100%;height:auto}</style></head>'
      + `<body><img src="${canvas.toDataURL('image/png')}" alt="${title}"></body></html>`
    return printAsPdf(html)
  }
  canvas.toBlob(blob => { if (blob) downloadBlob(blob, `${name}.png`) }, 'image/png')
  return null
}
