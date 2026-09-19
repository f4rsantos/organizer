import { DAMPING, FRICTION, MIN_VX, TOMATO_RADIUS } from './utils'

const MAX_SPIN = 120
const MAX_WOBBLE_SECONDS = 5
const ANGULAR_DRAG = 1.6
const REST_EPSILON = 4

function gravityDirection(env) {
  const mag = Math.sqrt(env.gx * env.gx + env.gy * env.gy)
  if (mag < REST_EPSILON) return { x: 0, y: 1, mag }
  return { x: env.gx / mag, y: env.gy / mag, mag }
}

function integrate(body, dt, env) {
  return {
    ...body,
    vx: body.vx + env.gx * dt,
    vy: body.vy + env.gy * dt,
    x: body.x + body.vx * dt,
    y: body.y + body.vy * dt,
  }
}

function applyContact(body, nx, ny, gDir, wobbleLeft) {
  const vn = body.vx * nx + body.vy * ny
  if (vn > 0) return body

  let { vx, vy, omega = 0 } = body
  const vt = -vx * ny + vy * nx
  vx -= vn * nx * (1 + DAMPING)
  vy -= vn * ny * (1 + DAMPING)

  const downhill = -(nx * gDir.x + ny * gDir.y)
  const settling = downhill > 0.5

  if (settling) {
    if (gDir.mag > REST_EPSILON) {
      const tangentX = -ny
      const tangentY = nx
      const vAlongNormal = vx * nx + vy * ny
      const vAlongTangent = (vx * tangentX + vy * tangentY) * FRICTION
      vx = nx * vAlongNormal + tangentX * vAlongTangent
      vy = ny * vAlongNormal + tangentY * vAlongTangent
    } else {
      vx *= FRICTION
      vy *= FRICTION
    }
    if (wobbleLeft > 0) omega += vt * 0.14 * downhill
    if (Math.abs(vx) < MIN_VX && Math.abs(vy) < MIN_VX && gDir.mag <= REST_EPSILON) { vx = 0; vy = 0 }
  } else {
    omega = -omega * 0.75
  }

  return { ...body, vx, vy, omega }
}

function resolveWalls(body, env, gDir) {
  const radius = body.radius ?? TOMATO_RADIUS
  const wobbleLeft = Number.isFinite(body.wobbleLeft) ? body.wobbleLeft : MAX_WOBBLE_SECONDS
  let next = body

  if (next.y >= env.floor - radius) {
    next = { ...next, y: env.floor - radius }
    next = applyContact(next, 0, -1, gDir, wobbleLeft)
  }
  if (next.x < env.wallLeft + radius) {
    next = { ...next, x: env.wallLeft + radius }
    next = applyContact(next, 1, 0, gDir, wobbleLeft)
  }
  if (next.x > env.wallRight - radius) {
    next = { ...next, x: env.wallRight - radius }
    next = applyContact(next, -1, 0, gDir, wobbleLeft)
  }
  if (next.y < radius) {
    next = { ...next, y: radius }
    next = applyContact(next, 0, 1, gDir, wobbleLeft)
  }

  return next
}

function spinAndWobble(body, dt, gDir) {
  let { vx, vy, rotation = 0, omega = 0 } = body
  let wobbleLeft = Number.isFinite(body.wobbleLeft) ? body.wobbleLeft : MAX_WOBBLE_SECONDS

  if (wobbleLeft > 0) omega += (vx * gDir.y - vy * gDir.x) * 0.18 * dt

  const moving = Math.sqrt(vx * vx + vy * vy)
  const spinDamping = moving > 8 ? 0.992 : 0.972
  omega *= spinDamping
  omega *= Math.exp(-ANGULAR_DRAG * dt)

  if (wobbleLeft > 0) {
    wobbleLeft = Math.max(0, wobbleLeft - dt)
    if (wobbleLeft === 0) omega = 0
  } else {
    omega = 0
  }

  omega = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, omega))
  rotation += omega * dt

  return { ...body, rotation, omega, wobbleLeft }
}

export function moveBody(body, dt, env) {
  if (env.draggingId === body.id) return body

  const gDir = gravityDirection(env)
  let next = integrate(body, dt, env)
  next = resolveWalls(next, env, gDir)
  next = spinAndWobble(next, dt, gDir)
  return next
}

export function resolveBodyCollisions(bodies) {
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i]
      const b = bodies[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const minDist = (a.radius ?? TOMATO_RADIUS) + (b.radius ?? TOMATO_RADIUS)
      if (!(dist < minDist && dist > 0)) continue

      const overlap = (minDist - dist) / 2
      const nx = dx / dist
      const ny = dy / dist
      const nextA = { ...a, x: a.x - nx * overlap, y: a.y - ny * overlap }
      const nextB = { ...b, x: b.x + nx * overlap, y: b.y + ny * overlap }
      const dvx = nextA.vx - nextB.vx
      const dvy = nextA.vy - nextB.vy
      const impulse = (dvx * nx + dvy * ny) * 0.6
      const aWobble = Number.isFinite(nextA.wobbleLeft) ? nextA.wobbleLeft : MAX_WOBBLE_SECONDS
      const bWobble = Number.isFinite(nextB.wobbleLeft) ? nextB.wobbleLeft : MAX_WOBBLE_SECONDS
      const spinKick = Math.max(6, Math.abs(impulse) * 0.55)

      bodies[i] = {
        ...nextA,
        vx: nextA.vx - impulse * nx,
        vy: nextA.vy - impulse * ny,
        omega: aWobble > 0 ? Math.max(-MAX_SPIN, Math.min(MAX_SPIN, (nextA.omega ?? 0) - spinKick)) : 0,
      }
      bodies[j] = {
        ...nextB,
        vx: nextB.vx + impulse * nx,
        vy: nextB.vy + impulse * ny,
        omega: bWobble > 0 ? Math.max(-MAX_SPIN, Math.min(MAX_SPIN, (nextB.omega ?? 0) + spinKick)) : 0,
      }
    }
  }
}

export function resolveObstacleCollisions(bodies, obstacles) {
  if (!obstacles || !obstacles.length) return
  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i]
    const radius = body.radius ?? TOMATO_RADIUS
    for (let o = 0; o < obstacles.length; o++) {
      const rect = obstacles[o]
      const closestX = Math.max(rect.left, Math.min(body.x, rect.right))
      const closestY = Math.max(rect.top, Math.min(body.y, rect.bottom))
      const dx = body.x - closestX
      const dy = body.y - closestY
      const distSq = dx * dx + dy * dy
      if (distSq >= radius * radius) continue

      const dist = Math.sqrt(distSq)
      let nx, ny, overlap
      if (dist > 0.0001) {
        nx = dx / dist
        ny = dy / dist
        overlap = radius - dist
      } else {
        const penLeft = body.x - rect.left
        const penRight = rect.right - body.x
        const penTop = body.y - rect.top
        const penBottom = rect.bottom - body.y
        const minPen = Math.min(penLeft, penRight, penTop, penBottom)
        if (minPen === penLeft) { nx = -1; ny = 0 }
        else if (minPen === penRight) { nx = 1; ny = 0 }
        else if (minPen === penTop) { nx = 0; ny = -1 }
        else { nx = 0; ny = 1 }
        overlap = radius + minPen
      }

      const vn = body.vx * nx + body.vy * ny
      const wobbleLeft = Number.isFinite(body.wobbleLeft) ? body.wobbleLeft : MAX_WOBBLE_SECONDS
      bodies[i] = {
        ...body,
        x: body.x + nx * overlap,
        y: body.y + ny * overlap,
        vx: body.vx - (vn < 0 ? vn * nx * (1 + DAMPING) : 0),
        vy: body.vy - (vn < 0 ? vn * ny * (1 + DAMPING) : 0),
        omega: wobbleLeft > 0
          ? Math.max(-MAX_SPIN, Math.min(MAX_SPIN, (body.omega ?? 0) - vn * nx * 6))
          : 0,
      }
    }
  }
}

export function stepBodies(prevBodies, dt, env) {
  const moved = prevBodies.map(body => moveBody(body, dt, env))
  resolveObstacleCollisions(moved, env.obstacles)
  resolveBodyCollisions(moved)
  return moved
}
