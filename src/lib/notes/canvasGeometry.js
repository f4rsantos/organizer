export const LEGACY_STROKE_COLOR = '#6366f1'
export const LEGACY_STROKE_WIDTH = 2

const ELLIPSE_STEPS = 48
const ERASE_STEP = 2
const MIN_PRESSURE_SCALE = 0.35
const PRESSURE_RANGE = 1.3
const LASSO_STEP = 4
const LASSO_INSIDE_SHARE = 0.7

function round1(value) {
  return Math.round(value * 10) / 10
}

export function roundPressure(value) {
  return Math.round(value * 100) / 100
}

export function normalizeStroke(stroke) {
  if (Array.isArray(stroke)) return { color: LEGACY_STROKE_COLOR, width: LEGACY_STROKE_WIDTH, points: stroke }
  return { ...stroke, points: Array.isArray(stroke?.points) ? stroke.points : [] }
}

export function hasPressure(points) {
  return points.length > 0 && points.every(p => Number.isFinite(p[2]))
}

export function pressureWidth(width, pressure) {
  if (!Number.isFinite(pressure)) return width
  return width * (MIN_PRESSURE_SCALE + pressure * PRESSURE_RANGE)
}

function distanceToSegment(x, y, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSq = dx * dx + dy * dy
  if (!lengthSq) return Math.hypot(x - a[0], y - a[1])
  const along = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / lengthSq))
  return Math.hypot(x - (a[0] + along * dx), y - (a[1] + along * dy))
}

export function strokeHit(raw, x, y, radius) {
  const { points, width } = normalizeStroke(raw)
  const reach = radius + width / 2
  if (points.length === 1) return Math.hypot(x - points[0][0], y - points[0][1]) <= reach
  for (let i = 1; i < points.length; i++) {
    if (distanceToSegment(x, y, points[i - 1], points[i]) <= reach) return true
  }
  return false
}

function interpolate(a, b, t) {
  const point = [round1(a[0] + (b[0] - a[0]) * t), round1(a[1] + (b[1] - a[1]) * t)]
  if (Number.isFinite(a[2]) && Number.isFinite(b[2])) point.push(roundPressure(a[2] + (b[2] - a[2]) * t))
  return point
}

function densify(points, step) {
  if (points.length < 2) return points
  const dense = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)
    for (let k = 1; k < steps; k++) dense.push(interpolate(a, b, k / steps))
    dense.push(b)
  }
  return dense
}

function piecesOutside(points, x, y, reach) {
  const pieces = []
  let current = []
  for (const point of points) {
    if (Math.hypot(point[0] - x, point[1] - y) > reach) { current.push(point); continue }
    if (current.length) pieces.push(current)
    current = []
  }
  if (current.length) pieces.push(current)
  return pieces.filter(piece => piece.length >= 2)
}

export function eraseAt(strokes, x, y, radius) {
  let changed = false
  const next = []
  for (const raw of strokes) {
    if (!strokeHit(raw, x, y, radius)) { next.push(raw); continue }
    changed = true
    const stroke = normalizeStroke(raw)
    if (stroke.shape) continue
    const reach = radius + stroke.width / 2
    for (const piece of piecesOutside(densify(stroke.points, ERASE_STEP), x, y, reach)) {
      next.push({ ...stroke, points: piece })
    }
  }
  return changed ? next : strokes
}

export function eraseStrokesAt(strokes, x, y, radius) {
  const next = strokes.filter(raw => !strokeHit(raw, x, y, radius))
  return next.length === strokes.length ? strokes : next
}

function ellipsePoints([x0, y0], [x1, y1]) {
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const rx = Math.abs(x1 - x0) / 2
  const ry = Math.abs(y1 - y0) / 2
  return Array.from({ length: ELLIPSE_STEPS + 1 }, (_, i) => {
    const angle = (i / ELLIPSE_STEPS) * Math.PI * 2
    return [round1(cx + rx * Math.cos(angle)), round1(cy + ry * Math.sin(angle))]
  })
}

export function shapePoints(shape, from, to) {
  if (shape === 'rect') return [from, [to[0], from[1]], to, [from[0], to[1]], from]
  if (shape === 'ellipse') return ellipsePoints(from, to)
  return [from, to]
}

export function appendPoint(points, point, minDistance) {
  const last = points[points.length - 1]
  if (last && Math.hypot(point[0] - last[0], point[1] - last[1]) < minDistance) return points
  return [...points, point]
}


function flatPoint(point) {
  return [point[0], point[1]]
}

export function buildStroke(gesture, { opacity = 1, widthScale = 1 } = {}) {
  const { tool, color, width, points } = gesture
  if (tool === 'highlighter') return { color, width: width * widthScale, opacity, points: points.map(flatPoint) }
  return { color, width, points }
}

export function boundsOfStrokes(strokes) {
  let box = null
  for (const raw of strokes) {
    const { points, width } = normalizeStroke(raw)
    const pad = width / 2
    for (const [x, y] of points) {
      box = box
        ? { minX: Math.min(box.minX, x - pad), minY: Math.min(box.minY, y - pad), maxX: Math.max(box.maxX, x + pad), maxY: Math.max(box.maxY, y + pad) }
        : { minX: x - pad, minY: y - pad, maxX: x + pad, maxY: y + pad }
    }
  }
  return box
}

function insidePolygon([x, y], polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function strokesInLasso(strokes, lasso) {
  const selected = new Set()
  if (lasso.length < 3) return selected
  strokes.forEach((raw, index) => {
    const points = densify(normalizeStroke(raw).points, LASSO_STEP)
    if (!points.length) return
    const inside = points.filter(point => insidePolygon(point, lasso)).length
    if (inside / points.length >= LASSO_INSIDE_SHARE) selected.add(index)
  })
  return selected
}

export function translateStrokes(strokes, selected, dx, dy) {
  return strokes.map((raw, index) => {
    if (!selected.has(index)) return raw
    const stroke = normalizeStroke(raw)
    return { ...stroke, points: stroke.points.map(([x, y, ...rest]) => [round1(x + dx), round1(y + dy), ...rest]) }
  })
}
