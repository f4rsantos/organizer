import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import {
  FACE_COUNT,
  GRAVITY,
  getPomodoroTimestamp,
  growthFromSecs,
  isPomodoroAggregate,
  POMODORO_UNITS_MAX,
  sizeFromPct,
  TOMATO_RADIUS,
} from './utils'
import { createGravitySensor, requiresDeviceOrientationPermission } from './gravity'
import { stepBodies, wakeBodies } from './physicsEngine'

const MAX_WOBBLE_SECONDS = 5
const FRESH_TOMATO_MS = 15000

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

function isFreshTomato(pomodoro, now) {
  const createdAt = getPomodoroTimestamp(pomodoro)
  return createdAt > 0 && now - createdAt < FRESH_TOMATO_MS
}

function dropBodyFromStore(pomodoro, id, width) {
  return createSpawnBody({
    id,
    pct: getStoredSizePct(pomodoro),
    abandoned: !!pomodoro.abandoned,
    colorPct: pomodoro.colorPct ?? 1,
    width,
    face: pomodoro.face,
    rotation: pomodoro.rotation,
  })
}

function buildBodiesFromPomodoros(prevBodies, pomodoros, bounds, { dropFresh }) {
  const width = Math.max(220, bounds.width || 400)
  const height = Math.max(320, bounds.height || 600)
  const byId = new Map(prevBodies.map(b => [String(b.id), b]))

  const sorted = [...pomodoros]
    .filter(p => !isPomodoroAggregate(p))
    .sort((a, b) => getPomodoroTimestamp(a) - getPomodoroTimestamp(b))

  if (!sorted.length) return []

  const now = Date.now()
  return sorted.map((pomodoro, idx) => {
    const id = String(pomodoro.id ?? `${pomodoro.createdAt}-${idx}`)
    const existing = byId.get(id)
    if (existing) return existing
    if (dropFresh && isFreshTomato(pomodoro, now)) return dropBodyFromStore(pomodoro, id, width)
    return createBodyFromStore(pomodoro, idx, width, height)
  })
}

function createSpawnBody({ id, pct, abandoned, colorPct, width, face, rotation }) {
  const size = sizeFromPct(pct)
  const radius = size / 2
  return {
    id,
    face: typeof face === 'number' ? face : Math.floor(Math.random() * FACE_COUNT),
    x: randomBodyX(radius, width),
    y: -size,
    vx: (Math.random() - 0.5) * 80,
    vy: 0,
    size,
    radius,
    rotation: typeof rotation === 'number' ? rotation : Math.random() * 40 - 20,
    omega: (Math.random() - 0.5) * 12,
    wobbleLeft: MAX_WOBBLE_SECONDS,
    abandoned,
    pct,
    colorPct,
  }
}

function createSpawnRecord({ body, abandoned, pct, colorPct, focusSecs, trackStats }) {
  const clampedFocusSecs = Math.max(0, Math.min(POMODORO_UNITS_MAX * 600, focusSecs ?? 0))
  return {
    id: body.id,
    face: body.face,
    abandoned,
    pct,
    colorPct,
    rotation: body.rotation,
    createdAt: Date.now(),
    ...(trackStats ? { focusSecs: clampedFocusSecs } : {}),
  }
}

const OBSTACLE_REFRESH_MS = 200

function isObstacleVisible(node) {
  if (typeof node.checkVisibility === 'function') {
    return node.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })
  }
  const style = window.getComputedStyle(node)
  return style.visibility !== 'hidden' && style.display !== 'none'
}

function collectObstacleRects(containerBounds) {
  const nodes = document.querySelectorAll('[data-tomato-obstacle]')
  const rects = []
  nodes.forEach(node => {
    if (!isObstacleVisible(node)) return
    const rect = node.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    rects.push({
      left: rect.left - containerBounds.left,
      top: rect.top - containerBounds.top,
      right: rect.right - containerBounds.left,
      bottom: rect.bottom - containerBounds.top,
    })
  })
  return rects
}

export function usePomodoroBodies({
  containerRef,
  pomodoros,
  addPomodoro,
  trackStats,
  focusRunning,
  resetSignal,
  periodIds,
  showPeriodStats,
}) {
  const [bodies, setBodies] = useState([])
  const [gravitySensor] = useState(() => createGravitySensor())

  const rafRef = useRef(null)
  const lastTimeRef = useRef(null)
  const hasSyncedBodiesRef = useRef(false)
  const draggingRef = useRef(null)
  const obstaclesRef = useRef([])
  const lastObstacleRefreshRef = useRef(0)
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

  const requestOrientationAccess = useCallback(() => gravitySensor.requestAccess(), [gravitySensor])

  useEffect(() => {
    if (requiresDeviceOrientationPermission()) return
    gravitySensor.enable()
  }, [gravitySensor])

  useEffect(() => {
    if (!requiresDeviceOrientationPermission()) return

    const grantOnFirstGesture = () => { void requestOrientationAccess() }
    document.addEventListener('pointerdown', grantOnFirstGesture, { once: true })
    return () => document.removeEventListener('pointerdown', grantOnFirstGesture)
  }, [requestOrientationAccess])

  const syncBodiesFromStore = useCallback(() => {
    const bounds = getBounds()
    const dropFresh = hasSyncedBodiesRef.current
    hasSyncedBodiesRef.current = true
    setBodies(prev => {
      const built = buildBodiesFromPomodoros(prev, pomodoros, bounds, { dropFresh })
      const next = showPeriodStats && periodIds && periodIds.size > 0
        ? built.filter(b => periodIds.has(String(b.id)))
        : built
      const lostSupport = prev.some(b => !next.some(n => n.id === b.id))
      return lostSupport ? wakeBodies(next) : next
    })
  }, [getBounds, pomodoros, periodIds, showPeriodStats])

  useEffect(() => {
    startTransition(() => {
      syncBodiesFromStore()
    })
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
    if (!resetSignal?.ts) return

    const shouldCreateAbandoned =
      resetSignal.phase === 'focus' &&
      resetSignal.cycleElapsed > 30

    if (shouldCreateAbandoned) {
      const pct = growthFromSecs(resetSignal.cycleElapsed)
      const colorPct = Math.min(1, Math.max(0, resetSignal.cycleElapsed) / (25 * 60))
      startTransition(() => {
        spawnTomato({
          abandoned: true,
          pct,
          colorPct,
          focusSecs: resetSignal.cycleElapsed,
        })
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

      if (time - lastObstacleRefreshRef.current > OBSTACLE_REFRESH_MS) {
        lastObstacleRefreshRef.current = time
        obstaclesRef.current = collectObstacleRects(bounds)
      }

      const env = {
        gx: gravitySensor.gravity.x * GRAVITY,
        gy: gravitySensor.gravity.y * GRAVITY,
        floor: bounds.height,
        wallLeft: 0,
        wallRight: bounds.width || 400,
        draggingId: draggingRef.current?.id,
        obstacles: obstaclesRef.current,
      }

      setBodies(prev => stepBodies(prev, dt, env))

      rafRef.current = requestAnimationFrame(tick)
    }

    lastTimeRef.current = null
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [focusRunning, hasActiveBodies, getBounds, gravitySensor])

  const handlePointerStart = (id, e) => {
    if (e?.button != null && e.button !== 0) return
    void requestOrientationAccess()
    draggingRef.current = { id, pointerId: e.pointerId, history: [] }
  }

  const handlePointerMove = useCallback(e => {
    if (!draggingRef.current) return
    if (e.pointerId != null && draggingRef.current.pointerId != null && e.pointerId !== draggingRef.current.pointerId) return

    const bounds = getBounds()
    const x = e.clientX - bounds.left
    const y = e.clientY - bounds.top
    const { id } = draggingRef.current

    const now = performance.now()
    const history = draggingRef.current.history
    history.push({ x, y, t: now })
    const cutoff = now - 100
    let i = 0
    while (i < history.length - 1 && history[i].t < cutoff) i++
    if (i > 0) history.splice(0, i)

    setBodies(prev => prev.map(b => (
      b.id === id ? { ...b, x, y, vx: 0, vy: 0, omega: 0 } : b
    )))
  }, [getBounds])

  const handlePointerEnd = useCallback(e => {
    if (!draggingRef.current) return
    if (e.pointerId != null && draggingRef.current.pointerId != null && e.pointerId !== draggingRef.current.pointerId) return

    const { id, history } = draggingRef.current

    let vx = 0
    let vy = 0
    if (history && history.length >= 2) {
      const first = history[0]
      const last = history[history.length - 1]
      const dt = (last.t - first.t) / 1000
      if (dt > 0) {
        vx = Math.max(-1200, Math.min(1200, (last.x - first.x) / dt))
        vy = Math.max(-1200, Math.min(1200, (last.y - first.y) / dt))
      }
    }

    if (vx === 0 && vy === 0) {
      vx = (Math.random() - 0.5) * 60
      vy = -80
    }

    setBodies(prev => prev.map(b => (
      b.id === id
        ? {
          ...b,
          vx,
          vy,
          omega: vx * 0.15,
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
      gravitySensor.teardown()
      cancelAnimationFrame(rafRef.current)
    }
  }, [gravitySensor])

  return {
    bodies,
    handlePointerStart,
  }
}
