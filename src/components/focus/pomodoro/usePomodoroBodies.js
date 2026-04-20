import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DAMPING,
  FACE_COUNT,
  FRICTION,
  GRAVITY,
  getPomodoroTimestamp,
  growthFromSecs,
  isPomodoroAggregate,
  MIN_VX,
  sizeFromPct,
  TOMATO_RADIUS,
} from './utils'

const MAX_SPIN = 120
const MAX_WOBBLE_SECONDS = 5
const ANGULAR_DRAG = 3.2

function randomBodyX(radius, width) {
  const safeWidth = Math.max(140, width || 400)
  return radius + 12 + Math.random() * Math.max(1, safeWidth - (radius + 12) * 2)
}

function getStoredSizePct(pomodoro) {
  const storedPct = Math.max(0, pomodoro.pct ?? 1)
  if (pomodoro.abandoned) return storedPct
  if (typeof pomodoro.focusSecs === 'number') return growthFromSecs(pomodoro.focusSecs)
  return storedPct
}

function createBodyFromStore(pomodoro, idx, width, height) {
  const id = String(pomodoro.id ?? `${pomodoro.createdAt}-${idx}`)
  const storedPct = Math.max(0, pomodoro.pct ?? 1)
  const size = sizeFromPct(getStoredSizePct(pomodoro))
  const radius = size / 2
  const y = Math.max(radius, height - radius - Math.random() * Math.min(height * 0.6, 220))
  const colorPct = Math.min(1, Math.max(0, pomodoro.colorPct ?? (pomodoro.abandoned ? storedPct : 1)))

  return {
    id,
    face: typeof pomodoro.face === 'number' ? pomodoro.face : Math.floor(Math.random() * FACE_COUNT),
    x: randomBodyX(radius, width),
    y,
    vx: 0,
    vy: 0,
    size,
    radius,
    rotation: typeof pomodoro.rotation === 'number' ? pomodoro.rotation : (Math.random() * 40 - 20),
    omega: 0,
    wobbleLeft: 0,
    abandoned: !!pomodoro.abandoned,
    pct: storedPct,
    colorPct,
  }
}

function buildBodiesFromPomodoros(prevBodies, pomodoros, bounds) {
  const width = Math.max(220, bounds.width || 400)
  const height = Math.max(320, bounds.height || 600)
  const byId = new Map(prevBodies.map(b => [String(b.id), b]))

  const sorted = [...pomodoros]
    .filter(p => !isPomodoroAggregate(p))
    .sort((a, b) => getPomodoroTimestamp(a) - getPomodoroTimestamp(b))

  if (!sorted.length) return []

  return sorted.map((pomodoro, idx) => {
    const id = String(pomodoro.id ?? `${pomodoro.createdAt}-${idx}`)
    return byId.get(id) ?? createBodyFromStore(pomodoro, idx, width, height)
  })
}

function createSpawnBody({ id, pct, abandoned, colorPct, width }) {
  const size = sizeFromPct(pct)
  const radius = size / 2
  return {
    id,
    face: Math.floor(Math.random() * FACE_COUNT),
    x: randomBodyX(radius, width),
    y: -size,
    vx: (Math.random() - 0.5) * 80,
    vy: 0,
    size,
    radius,
    rotation: Math.random() * 40 - 20,
    omega: (Math.random() - 0.5) * 12,
    wobbleLeft: MAX_WOBBLE_SECONDS,
    abandoned,
    pct,
    colorPct,
  }
}

function createSpawnRecord({ body, abandoned, pct, colorPct, focusSecs, trackStats }) {
  return {
    id: body.id,
    face: body.face,
    abandoned,
    pct,
    colorPct,
    rotation: body.rotation,
    createdAt: Date.now(),
    ...(trackStats ? { focusSecs } : {}),
  }
}

function moveBody(body, dt, env) {
  if (env.draggingId === body.id) return body

  const radius = body.radius ?? TOMATO_RADIUS
  let { x, y, vx, vy, rotation = 0, omega = 0 } = body
  let wobbleLeft = Number.isFinite(body.wobbleLeft) ? body.wobbleLeft : MAX_WOBBLE_SECONDS

  vx += env.gx * dt
  vy += env.gy * dt
  x += vx * dt
  y += vy * dt

  if (wobbleLeft > 0) omega += (vx * 0.18) * dt

  if (y >= env.floor - radius) {
    y = env.floor - radius
    vy = -Math.abs(vy) * DAMPING
    vx *= FRICTION
    if (wobbleLeft > 0) omega += vx * 0.14
    if (Math.abs(vx) < MIN_VX) vx = 0
  }
  if (x < env.wallLeft + radius) {
    x = env.wallLeft + radius
    vx = Math.abs(vx) * DAMPING
    omega = -omega * 0.75
  }
  if (x > env.wallRight - radius) {
    x = env.wallRight - radius
    vx = -Math.abs(vx) * DAMPING
    omega = -omega * 0.75
  }
  if (y < radius) {
    y = radius
    vy = Math.abs(vy) * DAMPING
    omega = -omega * 0.75
  }

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

  return { ...body, x, y, vx, vy, rotation, omega, wobbleLeft }
}

function resolveBodyCollisions(bodies) {
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

function stepBodies(prevBodies, dt, env) {
  const moved = prevBodies.map(body => moveBody(body, dt, env))
  resolveBodyCollisions(moved)
  return moved
}

function hasDeviceOrientationSupport() {
  return typeof window !== 'undefined' && typeof window.DeviceOrientationEvent !== 'undefined'
}

function requiresDeviceOrientationPermission() {
  return hasDeviceOrientationSupport() && typeof window.DeviceOrientationEvent.requestPermission === 'function'
}

function normalizeGravityFromTilt(beta, gamma) {
  const x = Math.max(-1, Math.min(1, gamma / 45))
  const y = Math.max(0, Math.min(1.5, (beta + 20) / 60))
  return { x, y }
}

function createOrientationHandler(gravityRef) {
  return event => {
    if (!Number.isFinite(event?.beta) || !Number.isFinite(event?.gamma)) return
    gravityRef.current = normalizeGravityFromTilt(event.beta, event.gamma)
  }
}

export function usePomodoroBodies({
  containerRef,
  pomodoros,
  addPomodoro,
  trackStats,
  phase,
  cycleElapsed,
  focusRunning,
  resetSignal,
}) {
  const [bodies, setBodies] = useState([])

  const gravityRef = useRef({ x: 0, y: 1 })
  const rafRef = useRef(null)
  const lastTimeRef = useRef(null)
  const prevPhaseRef = useRef(phase)
  const latestFocusSecsRef = useRef(0)
  const draggingRef = useRef(null)
  const orientationEnabledRef = useRef(false)
  const orientationHandlerRef = useRef(null)
  const hasActiveBodies = bodies.length > 0

  const getBounds = useCallback(() => {
    if (!containerRef.current) return { width: 400, height: 600, left: 0, top: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    return {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
    }
  }, [containerRef])

  const enableOrientationTracking = useCallback(() => {
    if (orientationEnabledRef.current || !hasDeviceOrientationSupport()) return true
    orientationHandlerRef.current = createOrientationHandler(gravityRef)
    window.addEventListener('deviceorientation', orientationHandlerRef.current)
    orientationEnabledRef.current = true
    return true
  }, [])

  const requestOrientationAccess = useCallback(async () => {
    if (!hasDeviceOrientationSupport()) return false
    if (!requiresDeviceOrientationPermission()) return enableOrientationTracking()

    try {
      const permission = await window.DeviceOrientationEvent.requestPermission()
      if (permission !== 'granted') return false
      return enableOrientationTracking()
    } catch {
      return false
    }
  }, [enableOrientationTracking])

  useEffect(() => {
    if (requiresDeviceOrientationPermission()) return
    enableOrientationTracking()
  }, [enableOrientationTracking])

  useEffect(() => {
    if (phase === 'focus') latestFocusSecsRef.current = cycleElapsed
  }, [phase, cycleElapsed])

  const syncBodiesFromStore = useCallback(() => {
    const bounds = getBounds()
    setBodies(prev => buildBodiesFromPomodoros(prev, pomodoros, bounds))
  }, [getBounds, pomodoros])

  useEffect(() => {
    syncBodiesFromStore()
  }, [syncBodiesFromStore])

  const buildSpawnData = useCallback(({ abandoned, pct = 1, focusSecs = 0, colorPct }) => {
    const bounds = getBounds()
    const resolvedColorPct = typeof colorPct === 'number' ? colorPct : (abandoned ? pct : 1)
    const body = createSpawnBody({
      id: Date.now() + Math.random(),
      pct,
      abandoned,
      colorPct: resolvedColorPct,
      width: bounds.width,
    })

    const record = createSpawnRecord({
      body,
      abandoned,
      pct,
      colorPct: resolvedColorPct,
      focusSecs,
      trackStats,
    })

    return { body, record }
  }, [getBounds, trackStats])

  const spawnTomato = useCallback(({ abandoned, pct = 1, focusSecs = 0, colorPct }) => {
    const { body, record } = buildSpawnData({ abandoned, pct, focusSecs, colorPct })
    setBodies(prev => [...prev, body])
    addPomodoro(record)
  }, [addPomodoro, buildSpawnData])

  useEffect(() => {
    const prev = prevPhaseRef.current

    if (prev === 'focus' && phase === 'break') {
      const completedPct = growthFromSecs(latestFocusSecsRef.current)
      spawnTomato({ abandoned: false, pct: completedPct, focusSecs: latestFocusSecsRef.current, colorPct: 1 })
    }

    prevPhaseRef.current = phase
  }, [phase, spawnTomato])

  useEffect(() => {
    if (!resetSignal?.ts) return

    const shouldCreateAbandoned =
      resetSignal.phase === 'focus' &&
      resetSignal.cycleElapsed > 30

    if (shouldCreateAbandoned) {
      const pct = growthFromSecs(resetSignal.cycleElapsed)
      const colorPct = Math.min(1, Math.max(0, resetSignal.cycleElapsed) / (25 * 60))
      spawnTomato({
        abandoned: true,
        pct,
        colorPct,
        focusSecs: resetSignal.cycleElapsed,
      })
    }
  }, [resetSignal, spawnTomato])

  useEffect(() => {
    if (!focusRunning && !hasActiveBodies) return

    const tick = time => {
      if (!lastTimeRef.current) lastTimeRef.current = time
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = time

      const bounds = getBounds()
      const env = {
        gx: gravityRef.current.x * GRAVITY,
        gy: gravityRef.current.y * GRAVITY,
        floor: bounds.height,
        wallLeft: 0,
        wallRight: bounds.width || 400,
        draggingId: draggingRef.current?.id,
      }

      setBodies(prev => stepBodies(prev, dt, env))

      rafRef.current = requestAnimationFrame(tick)
    }

    lastTimeRef.current = null
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [focusRunning, hasActiveBodies, getBounds])

  const handlePointerStart = (id, e) => {
    if (e?.button != null && e.button !== 0) return
    void requestOrientationAccess()
    draggingRef.current = { id, pointerId: e.pointerId }
  }

  const handlePointerMove = useCallback(e => {
    if (!draggingRef.current) return
    if (e.pointerId != null && draggingRef.current.pointerId != null && e.pointerId !== draggingRef.current.pointerId) return

    const bounds = getBounds()
    const x = e.clientX - bounds.left
    const y = e.clientY - bounds.top
    const { id } = draggingRef.current

    setBodies(prev => prev.map(b => (
      b.id === id ? { ...b, x, y, vx: 0, vy: 0, omega: 0 } : b
    )))
  }, [getBounds])

  const handlePointerEnd = useCallback(e => {
    if (!draggingRef.current) return
    if (e.pointerId != null && draggingRef.current.pointerId != null && e.pointerId !== draggingRef.current.pointerId) return

    const { id } = draggingRef.current

    setBodies(prev => prev.map(b => (
      b.id === id
        ? {
          ...b,
          vx: (Math.random() - 0.5) * 60,
          vy: -80,
          omega: (Math.random() - 0.5) * 90,
          wobbleLeft: MAX_WOBBLE_SECONDS,
        }
        : b
    )))

    draggingRef.current = null
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
    }
  }, [handlePointerMove, handlePointerEnd])

  useEffect(() => {
    return () => {
      if (orientationHandlerRef.current) {
        window.removeEventListener('deviceorientation', orientationHandlerRef.current)
      }
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return {
    bodies,
    handlePointerStart,
  }
}
