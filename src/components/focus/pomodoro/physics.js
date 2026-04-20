import { DAMPING, FRICTION, MIN_VX } from './utils'

const ANGULAR_DRAG = 3.2
const MAX_SPIN = 120
export const MAX_WOBBLE_SECS = 5

export function stepBody(b, gx, gy, dt) {
  const vx = b.vx + gx * dt
  const vy = b.vy + gy * dt
  const omega = b.wobbleLeft > 0 ? b.omega + vx * 0.18 * dt : b.omega
  return { ...b, vx, vy, x: b.x + vx * dt, y: b.y + vy * dt, omega }
}

export function resolveWalls(b, floor, wallRight) {
  let { x, y, vx, vy, omega = 0, wobbleLeft = 0, radius } = b
  if (y >= floor - radius) {
    y = floor - radius
    vy = -Math.abs(vy) * DAMPING
    vx *= FRICTION
    if (wobbleLeft > 0) omega += vx * 0.14
    if (Math.abs(vx) < MIN_VX) vx = 0
  }
  if (x < radius) { x = radius; vx = Math.abs(vx) * DAMPING; omega = -omega * 0.75 }
  if (x > wallRight - radius) { x = wallRight - radius; vx = -Math.abs(vx) * DAMPING; omega = -omega * 0.75 }
  if (y < radius) { y = radius; vy = Math.abs(vy) * DAMPING; omega = -omega * 0.75 }
  return { ...b, x, y, vx, vy, omega }
}

export function decayRotation(b, dt) {
  const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
  let omega = b.omega * (speed > 8 ? 0.992 : 0.972) * Math.exp(-ANGULAR_DRAG * dt)
  let wobbleLeft = b.wobbleLeft ?? 0
  if (wobbleLeft > 0) {
    wobbleLeft = Math.max(0, wobbleLeft - dt)
    if (wobbleLeft === 0) omega = 0
  } else {
    omega = 0
  }
  omega = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, omega))
  return { ...b, omega, wobbleLeft, rotation: (b.rotation ?? 0) + omega * dt }
}

function detectCollision(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const minDist = a.radius + b.radius
  if (dist >= minDist || dist === 0) return null
  return { overlap: (minDist - dist) / 2, nx: dx / dist, ny: dy / dist }
}

export function resolveCollisionPair(a, b) {
  const col = detectCollision(a, b)
  if (!col) return [a, b]
  const { overlap, nx, ny } = col
  const impulse = ((a.vx - b.vx) * nx + (a.vy - b.vy) * ny) * 0.6
  const spinKick = Math.max(6, Math.abs(impulse) * 0.55)
  const clamp = v => Math.max(-MAX_SPIN, Math.min(MAX_SPIN, v))
  return [
    { ...a, x: a.x - nx * overlap, y: a.y - ny * overlap, vx: a.vx - impulse * nx, vy: a.vy - impulse * ny, omega: a.wobbleLeft > 0 ? clamp(a.omega - spinKick) : 0 },
    { ...b, x: b.x + nx * overlap, y: b.y + ny * overlap, vx: b.vx + impulse * nx, vy: b.vy + impulse * ny, omega: b.wobbleLeft > 0 ? clamp(b.omega + spinKick) : 0 },
  ]
}
