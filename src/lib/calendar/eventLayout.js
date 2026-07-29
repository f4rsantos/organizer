import { isSameDay } from 'date-fns'

export const MINUTES_PER_DAY = 24 * 60

export function timeToMinutes(time) {
  if (typeof time !== 'string') return null
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

export function minutesToTime(minutes) {
  const clamped = Math.max(0, Math.min(MINUTES_PER_DAY, Math.round(minutes)))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function isTimed(event) {
  return Boolean(event?._range && event.startTime)
}

export function segmentForDay(event, day) {
  if (!isTimed(event)) return null

  const { start, end } = event._range
  const onStart = isSameDay(start, day)
  const onEnd = isSameDay(end, day)
  const withinSpan = day > start && day < end

  if (!onStart && !onEnd && !withinSpan) return null

  const startMinutes = timeToMinutes(event.startTime)
  if (startMinutes === null) return null

  const explicitEnd = timeToMinutes(event.endTime)
  const singleDay = onStart && onEnd

  if (singleDay) {
    const endMinutes = explicitEnd !== null && explicitEnd > startMinutes
      ? explicitEnd
      : Math.min(MINUTES_PER_DAY, startMinutes + 60)
    return { event, startMinutes, endMinutes, continuesBefore: false, continuesAfter: false }
  }

  if (onStart) {
    return { event, startMinutes, endMinutes: MINUTES_PER_DAY, continuesBefore: false, continuesAfter: true }
  }

  if (onEnd) {
    const endMinutes = explicitEnd ?? MINUTES_PER_DAY
    if (endMinutes <= 0) return null
    return { event, startMinutes: 0, endMinutes, continuesBefore: true, continuesAfter: false }
  }

  return { event, startMinutes: 0, endMinutes: MINUTES_PER_DAY, continuesBefore: true, continuesAfter: true }
}

export function segmentsForDay(events, day) {
  return events
    .map(event => segmentForDay(event, day))
    .filter(Boolean)
    .sort((a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes)
}

export function assignColumns(segments) {
  const laid = []
  let cluster = []
  let clusterEnd = -Infinity

  const flush = () => {
    if (!cluster.length) return
    const columnCount = Math.max(...cluster.map(item => item.column)) + 1
    cluster.forEach(item => { item.columnCount = columnCount })
    cluster = []
    clusterEnd = -Infinity
  }

  segments.forEach(segment => {
    if (segment.startMinutes >= clusterEnd) flush()

    const columns = cluster.map(item => item.endMinutes <= segment.startMinutes ? null : item.column)
    let column = 0
    while (columns.includes(column)) column += 1

    const item = { ...segment, column, columnCount: 1 }
    cluster.push(item)
    laid.push(item)
    clusterEnd = Math.max(clusterEnd, segment.endMinutes)
  })

  flush()
  return laid
}

export function layoutDayEvents(events, day) {
  return assignColumns(segmentsForDay(events, day))
}
