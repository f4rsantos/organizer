import { shapePoints } from './canvasGeometry'

const MIN_SHAPE_DIAGONAL = 20
const STRAIGHT_RATIO = 0.93
const CLOSED_GAP_RATIO = 0.25
const SIMPLIFY_RATIO = 0.07
const STRAIGHT_ANGLE_TOLERANCE = (25 * Math.PI) / 180
const RIGHT_ANGLE_TOLERANCE = (22 * Math.PI) / 180
const AXIS_TOLERANCE = (14 * Math.PI) / 180
const MIN_POLYGON_SIDES = 3
const MAX_POLYGON_SIDES = 6
const ELLIPSE_ERROR = 0.13

function round1(value) {
  return Math.round(value * 10) / 10
}

function flat(point) {
  return [round1(point[0]), round1(point[1])]
}

function distance(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

function pathLength(points) {
  let total = 0
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i])
  return total
}

function bounds(points) {
  const xs = points.map(p => p[0])
  const ys = points.map(p => p[1])
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
}

function distanceToLine(point, a, b) {
  const length = distance(a, b)
  if (!length) return distance(point, a)
  return Math.abs((b[0] - a[0]) * (a[1] - point[1]) - (a[0] - point[0]) * (b[1] - a[1])) / length
}

function simplify(points, epsilon) {
  if (points.length < 3) return points
  let farthest = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = distanceToLine(points[i], points[0], points[points.length - 1])
    if (d > farthest) { farthest = d; index = i }
  }
  if (farthest <= epsilon) return [points[0], points[points.length - 1]]
  const left = simplify(points.slice(0, index + 1), epsilon)
  const right = simplify(points.slice(index), epsilon)
  return [...left.slice(0, -1), ...right]
}

function simplifyClosed(points, epsilon) {
  let split = 0
  let farthest = 0
  points.forEach((point, i) => {
    const d = distance(point, points[0])
    if (d > farthest) { farthest = d; split = i }
  })
  const first = simplify(points.slice(0, split + 1), epsilon)
  const second = simplify([...points.slice(split), points[0]], epsilon)
  return [...first.slice(0, -1), ...second.slice(0, -1)]
}

function turnAngle(prev, at, next) {
  const a = Math.atan2(at[1] - prev[1], at[0] - prev[0])
  const b = Math.atan2(next[1] - at[1], next[0] - at[0])
  const diff = Math.abs(b - a) % (Math.PI * 2)
  return diff > Math.PI ? Math.PI * 2 - diff : diff
}

function dropStraightVertices(vertices) {
  let current = vertices
  let changed = true
  while (changed && current.length > 3) {
    changed = false
    for (let i = 0; i < current.length; i++) {
      const prev = current[(i - 1 + current.length) % current.length]
      const next = current[(i + 1) % current.length]
      if (turnAngle(prev, current[i], next) < STRAIGHT_ANGLE_TOLERANCE) {
        current = current.filter((_, k) => k !== i)
        changed = true
        break
      }
    }
  }
  return current
}

function ellipseError(points, box) {
  const cx = (box.minX + box.maxX) / 2
  const cy = (box.minY + box.maxY) / 2
  const rx = (box.maxX - box.minX) / 2
  const ry = (box.maxY - box.minY) / 2
  if (!rx || !ry) return Infinity
  const total = points.reduce((sum, [x, y]) => sum + Math.abs(Math.hypot((x - cx) / rx, (y - cy) / ry) - 1), 0)
  return total / points.length
}

function isRightAngled(corners) {
  return corners.every((corner, i) => {
    const prev = corners[(i + 3) % 4]
    const next = corners[(i + 1) % 4]
    return Math.abs(turnAngle(prev, corner, next) - Math.PI / 2) < RIGHT_ANGLE_TOLERANCE
  })
}

function isAxisAligned(corners) {
  return corners.every((corner, i) => {
    const next = corners[(i + 1) % 4]
    const angle = Math.abs(Math.atan2(next[1] - corner[1], next[0] - corner[0])) % (Math.PI / 2)
    return Math.min(angle, Math.PI / 2 - angle) < AXIS_TOLERANCE
  })
}

function closedPolygon(vertices) {
  const corners = vertices.map(flat)
  return [...corners, corners[0]]
}

function distanceToSegment(point, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSq = dx * dx + dy * dy
  if (!lengthSq) return distance(point, a)
  const along = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSq))
  return Math.hypot(point[0] - (a[0] + along * dx), point[1] - (a[1] + along * dy))
}

function polygonFitError(points, vertices) {
  const total = points.reduce((sum, point) => {
    let nearest = Infinity
    for (let i = 0; i < vertices.length; i++) {
      nearest = Math.min(nearest, distanceToSegment(point, vertices[i], vertices[(i + 1) % vertices.length]))
    }
    return sum + nearest
  }, 0)
  return total / points.length
}

function polygonShape(vertices, box) {
  if (vertices.length === 4 && isRightAngled(vertices) && isAxisAligned(vertices)) {
    return { shape: 'rect', points: shapePoints('rect', [box.minX, box.minY], [box.maxX, box.maxY]).map(flat) }
  }
  if (vertices.length === 4 && !isRightAngled(vertices)) return null
  return { shape: 'polygon', points: closedPolygon(vertices) }
}

function recognizeClosed(points, box, diagonal) {
  const error = ellipseError(points, box)
  const ellipse = { shape: 'ellipse', points: shapePoints('ellipse', [box.minX, box.minY], [box.maxX, box.maxY]).map(flat) }
  const meanRadius = (box.maxX - box.minX + box.maxY - box.minY) / 4
  const vertices = dropStraightVertices(simplifyClosed(points, diagonal * SIMPLIFY_RATIO))
  const isPolygon = vertices.length >= MIN_POLYGON_SIDES && vertices.length <= MAX_POLYGON_SIDES
  if (isPolygon && polygonFitError(points, vertices) < error * meanRadius) return polygonShape(vertices, box)
  if (error < ELLIPSE_ERROR) return ellipse
  return isPolygon ? polygonShape(vertices, box) : null
}

export function recognizeShape(points) {
  if (points.length < 3) return null
  const box = bounds(points)
  const diagonal = Math.hypot(box.maxX - box.minX, box.maxY - box.minY)
  if (diagonal < MIN_SHAPE_DIAGONAL) return null
  const start = points[0]
  const end = points[points.length - 1]
  const length = pathLength(points)
  if (distance(start, end) / length > STRAIGHT_RATIO) return { shape: 'line', points: [flat(start), flat(end)] }
  if (distance(start, end) > diagonal * CLOSED_GAP_RATIO) return null
  return recognizeClosed(points, box, diagonal)
}
