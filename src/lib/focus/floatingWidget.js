const EDGE_MARGIN = 8

export function clampWidgetPosition({ x, y, width, height, viewportWidth, viewportHeight, margin = EDGE_MARGIN }) {
  const maxX = Math.max(margin, viewportWidth - width - margin)
  const maxY = Math.max(margin, viewportHeight - height - margin)
  return {
    x: Math.min(Math.max(x, margin), maxX),
    y: Math.min(Math.max(y, margin), maxY),
  }
}

export function isFocusSessionActive(focusSync) {
  const status = focusSync?.status
  if (status !== 'started' && status !== 'paused') return false
  const phase = focusSync?.phase === 'break' ? 'break' : 'focus'
  const startedAt = focusSync?.startedAt
  const cycleElapsedBase = focusSync?.cycleElapsedBase ?? 0
  const totalElapsedBase = focusSync?.totalElapsedBase ?? 0
  const breakSecsLeftBase = focusSync?.breakSecsLeftBase ?? 0
  if (status === 'started') return true
  if (phase === 'break') return breakSecsLeftBase > 0
  return cycleElapsedBase > 0 || totalElapsedBase > 0 || startedAt != null
}
