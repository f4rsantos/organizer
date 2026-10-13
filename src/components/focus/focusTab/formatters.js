export function fmtTimer(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function fmtClockLabel({ phase, breakSecsLeft, timerSecsLeft, totalElapsed }) {
  if (phase === 'break') return fmtTimer(breakSecsLeft)
  return fmtTimer(timerSecsLeft ?? totalElapsed)
}

export function fmtMins(totalMins) {
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:00`
}
