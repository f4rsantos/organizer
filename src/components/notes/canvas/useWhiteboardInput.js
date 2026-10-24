import { useRef } from 'react'
import { appendPoint, buildStroke, eraseAt, eraseStrokesAt, roundPressure, strokesInLasso, translateStrokes } from '@/lib/notes/canvasGeometry'
import { recognizeShape } from '@/lib/notes/shapeRecognition'
import { panBy, screenToWorld, zoomAround } from '@/lib/notes/canvasViewport'
import { drawLasso, drawStroke, resolveInk } from '@/lib/notes/canvasRender'
import {
  HIGHLIGHTER_OPACITY, HIGHLIGHTER_WIDTH_SCALE,
  HOLD_SLOP_PX, HOLD_TO_SHAPE_MS, MIN_POINT_DISTANCE,
} from './canvasTools'

const BARREL_ERASER_BUTTON = 5
const BARREL_ERASER_BUTTONS_MASK = 32
const MIDDLE_BUTTON = 1
const ERASER_CURSOR_COLOR = 'rgba(128, 128, 128, 0.8)'
const STROKE_OPTIONS = { opacity: HIGHLIGHTER_OPACITY, widthScale: HIGHLIGHTER_WIDTH_SCALE }

function round1(value) {
  return Math.round(value * 10) / 10
}

function usesBarrelEraser(event) {
  return event.button === BARREL_ERASER_BUTTON || (event.buttons & BARREL_ERASER_BUTTONS_MASK) !== 0
}

function coalesced(event) {
  const native = event.nativeEvent ?? event
  const list = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : []
  return list.length ? list : [native]
}

function insideBounds([x, y], box) {
  return Boolean(box) && x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY
}

function gestureStroke(gesture) {
  return gesture.shape ?? buildStroke(gesture, STROKE_OPTIONS)
}

function pinchState(touches) {
  const [a, b] = [...touches.values()]
  return { distance: Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }
}

export function useWhiteboardInput({
  surfaceRef, viewRef, strokesRef, tool, pens, eraser, inkToShape, stylusOnly, spaceHeldRef, selectionBoundsRef,
  drawLive, clearLive, actions,
}) {
  const gestureRef = useRef(null)
  const touchesRef = useRef(new Map())

  const screenPoint = event => {
    const rect = surfaceRef.current.getBoundingClientRect()
    return [event.clientX - rect.left, event.clientY - rect.top]
  }

  const worldPoint = event => {
    const [x, y] = screenToWorld(viewRef.current, screenPoint(event))
    const point = [round1(x), round1(y)]
    return event.pointerType === 'pen' ? [...point, roundPressure(event.pressure || 0.5)] : point
  }

  const eraserRadius = () => eraser.radius / viewRef.current.zoom

  const showEraser = (point, radius) => drawLive(ctx => {
    ctx.strokeStyle = ERASER_CURSOR_COLOR
    ctx.lineWidth = 1 / viewRef.current.zoom
    ctx.beginPath()
    ctx.arc(point[0], point[1], radius, 0, Math.PI * 2)
    ctx.stroke()
  })

  const renderGesture = () => {
    const gesture = gestureRef.current
    if (!gesture) return
    if (gesture.kind === 'stroke') {
      drawLive(ctx => drawStroke(ctx, gestureStroke(gesture), resolveInk(surfaceRef.current)))
      return
    }
    if (gesture.kind === 'lasso') drawLive(ctx => drawLasso(ctx, gesture.points, viewRef.current.zoom))
  }

  const armHold = (gesture, anchor) => {
    clearTimeout(gesture.holdTimer)
    gesture.anchor = anchor
    if (!inkToShape || gesture.tool === 'highlighter') return
    gesture.holdTimer = setTimeout(() => {
      if (gestureRef.current !== gesture) return
      const shape = recognizeShape(gesture.points)
      if (!shape) return
      gesture.shape = { color: gesture.color, width: gesture.width, ...shape }
      renderGesture()
    }, HOLD_TO_SHAPE_MS)
  }

  const trackHold = (gesture, event) => {
    const point = screenPoint(event)
    if (Math.hypot(point[0] - gesture.anchor[0], point[1] - gesture.anchor[1]) <= HOLD_SLOP_PX) return
    gesture.shape = null
    armHold(gesture, point)
  }

  const cancelGesture = () => {
    const gesture = gestureRef.current
    clearTimeout(gesture?.holdTimer)
    gestureRef.current = null
    clearLive()
    if (gesture?.before) actions.preview(gesture.before)
  }

  const startPinch = () => {
    cancelGesture()
    gestureRef.current = { kind: 'pinch', ...pinchState(touchesRef.current), view: viewRef.current }
  }

  const startToolGesture = (event, point) => {
    const activeTool = usesBarrelEraser(event) ? 'eraser' : tool
    if (activeTool === 'eraser') {
      gestureRef.current = { kind: 'erase', whole: eraser.mode === 'stroke', pointerId: event.pointerId, before: strokesRef.current, radius: eraserRadius() }
      erase(point)
      return
    }
    if (activeTool === 'select') {
      if (insideBounds(point, selectionBoundsRef.current)) {
        gestureRef.current = { kind: 'move', pointerId: event.pointerId, before: strokesRef.current, origin: point }
        return
      }
      actions.select(new Set())
      gestureRef.current = { kind: 'lasso', pointerId: event.pointerId, points: [point] }
      return
    }
    const pen = pens[activeTool]
    const gesture = { kind: 'stroke', tool: activeTool, pointerId: event.pointerId, color: pen.color, width: pen.width, points: [point], shape: null }
    gestureRef.current = gesture
    armHold(gesture, screenPoint(event))
    renderGesture()
  }

  const erase = point => {
    const gesture = gestureRef.current
    showEraser(point, gesture.radius)
    const eraser = gesture.whole ? eraseStrokesAt : eraseAt
    const next = eraser(strokesRef.current, point[0], point[1], gesture.radius)
    if (next !== strokesRef.current) actions.preview(next)
  }

  const onPointerDown = event => {
    actions.dismissMenus()
    if (event.pointerType === 'pen') actions.stylusSeen()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    if (event.pointerType === 'touch') {
      touchesRef.current.set(event.pointerId, screenPoint(event))
      if (touchesRef.current.size === 2) { startPinch(); return }
      if (touchesRef.current.size > 2 || gestureRef.current) return
      if (stylusOnly) {
        gestureRef.current = { kind: 'pan', pointerId: event.pointerId, last: screenPoint(event) }
        return
      }
    }
    if (gestureRef.current) return
    const panning = event.button === MIDDLE_BUTTON || (spaceHeldRef.current && event.pointerType === 'mouse')
    if (panning) {
      gestureRef.current = { kind: 'pan', pointerId: event.pointerId, last: screenPoint(event) }
      return
    }
    if (event.button !== 0 && !usesBarrelEraser(event)) return
    startToolGesture(event, worldPoint(event))
  }

  const movePinch = event => {
    touchesRef.current.set(event.pointerId, screenPoint(event))
    const gesture = gestureRef.current
    const { distance, mid } = pinchState(touchesRef.current)
    const zoomed = zoomAround(gesture.view, distance / gesture.distance, gesture.mid)
    actions.setView(panBy(zoomed, mid[0] - gesture.mid[0], mid[1] - gesture.mid[1]))
  }

  const onPointerMove = event => {
    const gesture = gestureRef.current
    if (gesture?.kind === 'pinch' && touchesRef.current.has(event.pointerId)) { movePinch(event); return }
    if (!gesture) {
      if (tool === 'eraser' && event.pointerType === 'mouse') showEraser(worldPoint(event), eraserRadius())
      return
    }
    if (gesture.pointerId !== event.pointerId) return
    if (gesture.kind === 'pan') {
      const point = screenPoint(event)
      actions.setView(panBy(viewRef.current, point[0] - gesture.last[0], point[1] - gesture.last[1]))
      gesture.last = point
      return
    }
    if (gesture.kind === 'move') {
      const point = worldPoint(event)
      actions.preview(translateStrokes(gesture.before, actions.selection(), point[0] - gesture.origin[0], point[1] - gesture.origin[1]))
      return
    }
    if (gesture.kind === 'stroke') trackHold(gesture, event)
    for (const sample of coalesced(event)) {
      const point = worldPoint(sample)
      if (gesture.kind === 'erase') erase(point)
      else gesture.points = appendPoint(gesture.points, point, MIN_POINT_DISTANCE / viewRef.current.zoom)
    }
    renderGesture()
  }

  const finish = event => {
    touchesRef.current.delete(event.pointerId)
    const gesture = gestureRef.current
    if (!gesture) return
    if (gesture.kind === 'pinch') {
      if (touchesRef.current.size < 2) gestureRef.current = null
      return
    }
    if (gesture.pointerId !== event.pointerId) return
    clearTimeout(gesture.holdTimer)
    gestureRef.current = null
    clearLive()
    if (gesture.kind === 'erase' || gesture.kind === 'move') {
      if (strokesRef.current !== gesture.before) actions.commitFrom(gesture.before)
      return
    }
    if (gesture.kind === 'lasso') { actions.select(strokesInLasso(strokesRef.current, gesture.points)); return }
    if (gesture.kind === 'stroke') actions.addStroke(gestureStroke(gesture))
  }

  const onPointerLeave = () => {
    if (!gestureRef.current) clearLive()
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    onPointerLeave,
  }
}
