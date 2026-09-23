import { DAMPING, FRICTION, TOMATO_RADIUS } from './utils'

const MAX_SPIN = 120
const MAX_WOBBLE_SECONDS = 5
const ANGULAR_DRAG = 1.6
const REST_EPSILON = 4
const SOLVER_PASSES = 6
const BOUNCE_MIN_SPEED = 80
const BODY_RESTITUTION = 0.2
const OVERLAP_SLOP = 0.5
const OVERLAP_CORRECTION = 0.8
const SLEEP_SPEED = 20
const SLEEP_SPIN = 2
const SLEEP_AFTER_SECONDS = 0.4
const WAKE_SPEED = 40
const WAKE_GRAVITY_CHANGE = 25

function clampSpin(omega) {
  return Math.max(-MAX_SPIN, Math.min(MAX_SPIN, omega))
}

function wobbleOf(body) {
  return Number.isFinite(body.wobbleLeft) ? body.wobbleLeft : MAX_WOBBLE_SECONDS
}

function gravityDirection(env) {
  const mag = Math.sqrt(env.gx * env.gx + env.gy * env.gy)
  if (mag < REST_EPSILON) return { x: 0, y: 1, mag }
  return { x: env.gx / mag, y: env.gy / mag, mag }
}

function isPinned(body, env) {
  return body.asleep === true || env.draggingId === body.id
}

function awake(body) {
  return { ...body, asleep: false, restFor: 0 }
}

export function wakeBodies(bodies) {
  return bodies.map(body => (body.asleep ? awake(body) : body))
}

function surroundingsKey(env) {
  const obstacles = (env.obstacles ?? []).map(r => `${r.left},${r.top},${r.right},${r.bottom}`).join('|')
  return `${env.floor};${env.wallLeft};${env.wallRight};${obstacles}`
}

function tiltedSinceSleep(body, env) {
  const since = body.sleepGravity
  if (!since) return true
  return Math.hypot(env.gx - since.x, env.gy - since.y) > WAKE_GRAVITY_CHANGE
}

function integrate(body, dt, env, surroundings) {
  if (env.draggingId === body.id) return body.asleep ? awake(body) : body
  if (body.asleep) {
    const disturbed = tiltedSinceSleep(body, env) || body.sleepSurroundings !== surroundings
    if (!disturbed) return body
    body = awake(body)
  }
  return {
    ...body,
    vx: body.vx + env.gx * dt,
    vy: body.vy + env.gy * dt,
    x: body.x + body.vx * dt,
    y: body.y + body.vy * dt,
  }
}

function applyContact(body, nx, ny, gDir, firstPass) {
  const vn = body.vx * nx + body.vy * ny
  if (vn >= 0) return body

  const restitution = -vn > BOUNCE_MIN_SPEED ? DAMPING : 0
  let vx = body.vx - vn * nx * (1 + restitution)
  let vy = body.vy - vn * ny * (1 + restitution)
  let omega = body.omega ?? 0
  if (!firstPass) return { ...body, vx, vy }

  const vt = -body.vx * ny + body.vy * nx
  const downhill = -(nx * gDir.x + ny * gDir.y)
  if (downhill <= 0.5) return { ...body, vx, vy, omega: -omega * 0.75 }

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
  if (wobbleOf(body) > 0) omega += vt * 0.14 * downhill
  return { ...body, vx, vy, omega }
}

function resolveWalls(body, env, gDir, firstPass) {
  if (isPinned(body, env)) return body
  const radius = body.radius ?? TOMATO_RADIUS
  let next = body

  if (next.y >= env.floor - radius) {
    next = applyContact({ ...next, y: env.floor - radius }, 0, -1, gDir, firstPass)
  }
  if (next.x < env.wallLeft + radius) {
    next = applyContact({ ...next, x: env.wallLeft + radius }, 1, 0, gDir, firstPass)
  }
  if (next.x > env.wallRight - radius) {
    next = applyContact({ ...next, x: env.wallRight - radius }, -1, 0, gDir, firstPass)
  }
  if (next.y < radius) {
    next = applyContact({ ...next, y: radius }, 0, 1, gDir, firstPass)
  }

  return next
}

function pushShares(aPinned, bPinned) {
  if (aPinned) return [0, 1]
  if (bPinned) return [1, 0]
  return [0.5, 0.5]
}

function resolveBodyPair(bodies, i, j, env, firstPass) {
  const a = bodies[i]
  const b = bodies[j]
  const aPinned = isPinned(a, env)
  const bPinned = isPinned(b, env)
  if (aPinned && bPinned) return

  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const minDist = (a.radius ?? TOMATO_RADIUS) + (b.radius ?? TOMATO_RADIUS)
  if (!(dist < minDist && dist > 0)) return

  const nx = dx / dist
  const ny = dy / dist
  const approach = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny
  const hitHard = approach > WAKE_SPEED
  let nextA = a.asleep && hitHard && !bPinned ? awake(a) : a
  let nextB = b.asleep && hitHard && !aPinned ? awake(b) : b
  const [shareA, shareB] = pushShares(isPinned(nextA, env), isPinned(nextB, env))

  const correction = Math.max(0, minDist - dist - OVERLAP_SLOP) * OVERLAP_CORRECTION
  nextA = { ...nextA, x: nextA.x - nx * correction * shareA, y: nextA.y - ny * correction * shareA }
  nextB = { ...nextB, x: nextB.x + nx * correction * shareB, y: nextB.y + ny * correction * shareB }

  if (approach > 0) {
    const restitution = approach > BOUNCE_MIN_SPEED ? BODY_RESTITUTION : 0
    const impulse = approach * (1 + restitution)
    nextA = { ...nextA, vx: nextA.vx - impulse * nx * shareA, vy: nextA.vy - impulse * ny * shareA }
    nextB = { ...nextB, vx: nextB.vx + impulse * nx * shareB, vy: nextB.vy + impulse * ny * shareB }

    if (firstPass && approach > BOUNCE_MIN_SPEED) {
      const spinKick = approach * (1 + restitution) * 0.5 * 0.55
      if (wobbleOf(nextA) > 0 && shareA > 0) nextA = { ...nextA, omega: clampSpin((nextA.omega ?? 0) - spinKick) }
      if (wobbleOf(nextB) > 0 && shareB > 0) nextB = { ...nextB, omega: clampSpin((nextB.omega ?? 0) + spinKick) }
    }
  }

  bodies[i] = nextA
  bodies[j] = nextB
}

function resolveBodyCollisions(bodies, env, firstPass) {
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) resolveBodyPair(bodies, i, j, env, firstPass)
  }
}

function obstacleNormal(body, rect, radius) {
  const closestX = Math.max(rect.left, Math.min(body.x, rect.right))
  const closestY = Math.max(rect.top, Math.min(body.y, rect.bottom))
  const dx = body.x - closestX
  const dy = body.y - closestY
  const distSq = dx * dx + dy * dy
  if (distSq >= radius * radius) return null

  const dist = Math.sqrt(distSq)
  if (dist > 0.0001) return { nx: dx / dist, ny: dy / dist, overlap: radius - dist }

  const penLeft = body.x - rect.left
  const penRight = rect.right - body.x
  const penTop = body.y - rect.top
  const penBottom = rect.bottom - body.y
  const minPen = Math.min(penLeft, penRight, penTop, penBottom)
  if (minPen === penLeft) return { nx: -1, ny: 0, overlap: radius + minPen }
  if (minPen === penRight) return { nx: 1, ny: 0, overlap: radius + minPen }
  if (minPen === penTop) return { nx: 0, ny: -1, overlap: radius + minPen }
  return { nx: 0, ny: 1, overlap: radius + minPen }
}

function resolveObstacleCollisions(bodies, obstacles, env, firstPass) {
  if (!obstacles || !obstacles.length) return
  for (let i = 0; i < bodies.length; i++) {
    if (env.draggingId === bodies[i].id) continue
    const radius = bodies[i].radius ?? TOMATO_RADIUS
    for (let o = 0; o < obstacles.length; o++) {
      const body = bodies[i]
      const contact = obstacleNormal(body, obstacles[o], radius)
      if (!contact) continue

      const { nx, ny, overlap } = contact
      const vn = body.vx * nx + body.vy * ny
      const restitution = -vn > BOUNCE_MIN_SPEED ? DAMPING : 0
      const bounce = vn < 0 ? vn * (1 + restitution) : 0
      const spun = firstPass && wobbleOf(body) > 0 && -vn > BOUNCE_MIN_SPEED
      bodies[i] = {
        ...(body.asleep ? awake(body) : body),
        x: body.x + nx * overlap,
        y: body.y + ny * overlap,
        vx: body.vx - bounce * nx,
        vy: body.vy - bounce * ny,
        omega: spun ? clampSpin((body.omega ?? 0) - vn * nx * 6) : (body.omega ?? 0),
      }
    }
  }
}

function spinAndWobble(body, dt, gDir) {
  let { rotation = 0, omega = 0 } = body
  const { vx, vy } = body
  let wobbleLeft = wobbleOf(body)

  if (wobbleLeft > 0) omega += (vx * gDir.y - vy * gDir.x) * 0.18 * dt

  const moving = Math.sqrt(vx * vx + vy * vy)
  omega *= moving > 8 ? 0.992 : 0.972
  omega *= Math.exp(-ANGULAR_DRAG * dt)

  if (wobbleLeft > 0) {
    wobbleLeft = Math.max(0, wobbleLeft - dt)
    if (wobbleLeft === 0) omega = 0
  } else {
    omega = 0
  }

  omega = clampSpin(omega)
  return { ...body, rotation: rotation + omega * dt, omega, wobbleLeft }
}

function settle(body, dt, env, gDir, surroundings) {
  if (body.asleep || env.draggingId === body.id) return body

  const spun = spinAndWobble(body, dt, gDir)
  const still = Math.hypot(spun.vx, spun.vy) < SLEEP_SPEED && Math.abs(spun.omega) < SLEEP_SPIN
  const restFor = still ? (spun.restFor ?? 0) + dt : 0
  if (restFor < SLEEP_AFTER_SECONDS) return { ...spun, restFor }

  return {
    ...spun,
    vx: 0,
    vy: 0,
    omega: 0,
    restFor,
    asleep: true,
    sleepGravity: { x: env.gx, y: env.gy },
    sleepSurroundings: surroundings,
  }
}

export function stepBodies(prevBodies, dt, env) {
  const gDir = gravityDirection(env)
  const surroundings = surroundingsKey(env)
  const bodies = prevBodies.map(body => integrate(body, dt, env, surroundings))

  for (let pass = 0; pass < SOLVER_PASSES; pass++) {
    const firstPass = pass === 0
    resolveObstacleCollisions(bodies, env.obstacles, env, firstPass)
    resolveBodyCollisions(bodies, env, firstPass)
    for (let i = 0; i < bodies.length; i++) bodies[i] = resolveWalls(bodies[i], env, gDir, firstPass)
  }

  const settled = bodies.map(body => settle(body, dt, env, gDir, surroundings))
  const unchanged = settled.length === prevBodies.length && settled.every((body, i) => body === prevBodies[i])
  return unchanged ? prevBodies : settled
}
