import { describe, it, expect } from 'vitest'
import { advanceBodies, splitFrame, stepBodies, wakeBodies } from '../../../../src/components/focus/pomodoro/physicsEngine.js'

const FRAME = 1 / 60
const SETTLE_FRAMES = 60 * 8
const WATCH_FRAMES = 120
const STILL_PX = 0.05

const env = (fields = {}) => ({
  gx: 0,
  gy: 800,
  floor: 600,
  wallLeft: 0,
  wallRight: 400,
  draggingId: null,
  obstacles: [],
  ...fields,
})

const body = (id, x, y, radius = 28) => ({
  id, x, y, vx: 0, vy: 0, radius, size: radius * 2, rotation: 0, omega: 0, wobbleLeft: 5,
})

function seededRandom(seed) {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
  }
}

function droppedPile(count, seed) {
  const random = seededRandom(seed)
  return Array.from({ length: count }, (_, i) => ({
    ...body(`t${i}`, 30 + random() * 340, -60 * i, 10 + random() * 30),
    vx: (random() - 0.5) * 80,
  }))
}

function asleepCount(bodies) {
  return bodies.filter(b => b.asleep).length
}

function run(bodies, frames, environment) {
  let current = bodies
  for (let i = 0; i < frames; i++) current = stepBodies(current, FRAME, environment)
  return current
}

function maxMovementPerFrame(bodies, frames, environment) {
  let current = bodies
  let worst = 0
  for (let i = 0; i < frames; i++) {
    const next = stepBodies(current, FRAME, environment)
    next.forEach((b, idx) => {
      const moved = Math.hypot(b.x - current[idx].x, b.y - current[idx].y)
      const turned = Math.abs(b.rotation - current[idx].rotation)
      worst = Math.max(worst, moved, turned)
    })
    current = next
  }
  return worst
}

describe('tomatoes at rest', () => {
  it('sit still on the floor once settled', () => {
    const settled = run([body('a', 100, 100)], SETTLE_FRAMES, env())
    expect(maxMovementPerFrame(settled, WATCH_FRAMES, env())).toBeLessThan(STILL_PX)
  })

  it('sit still in a pile once settled', () => {
    const pile = [
      body('a', 60, 500), body('b', 118, 500), body('c', 176, 500),
      body('d', 90, 420), body('e', 148, 420), body('f', 120, 340),
    ]
    const settled = run(pile, SETTLE_FRAMES, env())
    expect(maxMovementPerFrame(settled, WATCH_FRAMES, env())).toBeLessThan(STILL_PX)
  })

  it('still roll when the device tilts', () => {
    const settled = run([body('a', 200, 100)], SETTLE_FRAMES, env())
    const tilted = run(settled, 60, env({ gx: 400, gy: 700 }))
    expect(tilted[0].x - settled[0].x).toBeGreaterThan(20)
  })

  it('ignore gyro noise while the phone lies still', () => {
    const settled = run([body('a', 100, 500), body('b', 160, 500)], SETTLE_FRAMES, env())
    let current = settled
    let worst = 0
    for (let i = 0; i < WATCH_FRAMES; i++) {
      const noise = env({ gx: Math.sin(i) * 6, gy: 800 + Math.cos(i * 1.7) * 6 })
      const next = stepBodies(current, FRAME, noise)
      next.forEach((b, idx) => { worst = Math.max(worst, Math.hypot(b.x - current[idx].x, b.y - current[idx].y)) })
      current = next
    }
    expect(worst).toBeLessThan(STILL_PX)
  })

  it('fall again when the tomato holding them up is removed', () => {
    const stack = run([body('base', 200, 540), body('top', 200, 480)], SETTLE_FRAMES, env())
    const topBefore = stack.find(b => b.id === 'top')
    const alone = run(wakeBodies([topBefore]), 60, env())
    expect(alone[0].y).toBeGreaterThan(topBefore.y + 20)
  })

  it('stop returning new objects once everything sleeps', () => {
    const settled = run([body('a', 100, 100)], SETTLE_FRAMES, env())
    expect(stepBodies(settled, FRAME, env())).toBe(settled)
  })

  it('still bounce when dropped from high up', () => {
    let current = [body('a', 200, 100)]
    let lowestVy = 0
    for (let i = 0; i < 90; i++) {
      current = stepBodies(current, FRAME, env())
      lowestVy = Math.min(lowestVy, current[0].vy)
    }
    expect(lowestVy).toBeLessThan(-50)
  })

  it('fall asleep in a deep pile of mixed sizes instead of jittering forever', () => {
    const settled = run(droppedPile(40, 2), SETTLE_FRAMES * 2, env())
    expect(asleepCount(settled)).toBe(settled.length)
    expect(maxMovementPerFrame(settled, WATCH_FRAMES, env())).toBeLessThan(STILL_PX)
  })

  it('stay asleep while resting on a page element', () => {
    const card = { left: 100.3, top: 300.7, right: 299.6, bottom: 500.2 }
    const settled = run(droppedPile(30, 7), SETTLE_FRAMES * 2, env({ obstacles: [card] }))
    expect(asleepCount(settled)).toBe(settled.length)
  })

  it('settle a big pile when frames arrive at uneven intervals', () => {
    const random = seededRandom(14)
    let current = droppedPile(60, 13)
    let carrySecs = 0
    for (let frame = 0; frame < SETTLE_FRAMES * 8; frame++) {
      const split = splitFrame(carrySecs, FRAME + random() * 0.03)
      carrySecs = split.carrySecs
      current = advanceBodies(current, split.steps, env())
    }
    expect(asleepCount(current)).toBe(current.length)
  })
})

describe('splitFrame', () => {
  it('carries leftover time so uneven frames add up to the same simulated time', () => {
    let carrySecs = 0
    let steps = 0
    for (const frameSecs of [0.016, 0.017, 0.02, 0.013, 0.0167, 0.0173]) {
      const split = splitFrame(carrySecs, frameSecs)
      carrySecs = split.carrySecs
      steps += split.steps
    }
    expect(steps).toBe(12)
  })

  it('caps a long stall so the pile does not teleport after the tab wakes up', () => {
    expect(splitFrame(0, 5).steps).toBe(6)
  })
})
