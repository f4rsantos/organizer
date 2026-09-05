import { matchDay, splitTitleAndNote } from './scheduleParser'

const TIME_ONLY = /^(\d{1,2})\s*[:h.]\s*(\d{2})$/

function pad(n) {
  return String(n).padStart(2, '0')
}

function parseGutterTime(text) {
  const match = TIME_ONLY.exec(String(text ?? '').trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return h * 60 + m
}

function centreX(box) {
  return (box.x0 + box.x1) / 2
}

export function findDayColumns(words) {
  const hits = []
  for (const word of words) {
    const dayIndex = matchDay(word.text)
    if (dayIndex == null) continue
    hits.push({ dayIndex, centre: centreX(word), y: word.y0 })
  }
  if (!hits.length) return []

  const topY = Math.min(...hits.map(h => h.y))
  const header = hits.filter(h => h.y - topY < 40)

  const byDay = new Map()
  for (const h of header) if (!byDay.has(h.dayIndex)) byDay.set(h.dayIndex, h)
  const columns = [...byDay.values()].sort((a, b) => a.centre - b.centre)

  for (let i = 0; i < columns.length; i++) {
    const prev = columns[i - 1]
    const next = columns[i + 1]
    columns[i].left = prev ? (prev.centre + columns[i].centre) / 2 : -Infinity
    columns[i].right = next ? (columns[i].centre + next.centre) / 2 : Infinity
    columns[i].headerBottom = Math.max(...header.filter(h => h.dayIndex === columns[i].dayIndex).map(h => h.y))
  }
  return columns
}

export function findTimeScale(words) {
  const marks = []
  for (const word of words) {
    const minutes = parseGutterTime(word.text)
    if (minutes == null) continue
    marks.push({ minutes, y: (word.y0 + word.y1) / 2, x1: word.x1 })
  }
  if (marks.length < 2) return null

  const leftEdge = Math.min(...marks.map(m => m.x1))
  const gutter = marks.filter(m => m.x1 <= leftEdge * 1.8).sort((a, b) => a.y - b.y)
  if (gutter.length < 2) return null

  const first = gutter[0]
  const last = gutter[gutter.length - 1]
  const dy = last.y - first.y
  const dm = last.minutes - first.minutes
  if (dy <= 0 || dm <= 0) return null

  return {
    minutesPerPixel: dm / dy,
    originY: first.y,
    originMinutes: first.minutes,
    gutterRight: Math.max(...gutter.map(m => m.x1)),
  }
}

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function groupColumnWords(words) {
  const sorted = [...words].sort((a, b) => a.y0 - b.y0)
  const heights = sorted.map(w => w.y1 - w.y0)
  const tol = Math.max(5, median(heights) * 0.6)

  const lines = []
  for (const word of sorted) {
    const mid = (word.y0 + word.y1) / 2
    const line = lines.find(l => Math.abs(l.mid - mid) <= tol)
    if (line) {
      line.words.push(word)
      line.mid = line.words.reduce((sum, w) => sum + (w.y0 + w.y1) / 2, 0) / line.words.length
      line.y0 = Math.min(line.y0, word.y0)
      line.y1 = Math.max(line.y1, word.y1)
    } else {
      lines.push({ mid, y0: word.y0, y1: word.y1, words: [word] })
    }
  }

  return lines.map(l => ({
    y0: l.y0,
    y1: l.y1,
    mid: l.mid,
    text: l.words.sort((a, b) => a.x0 - b.x0).map(w => w.text).join(' '),
  }))
}

function minutesToTime(total) {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(total)))
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`
}

function snap(minutes, step = 30) {
  return Math.round(minutes / step) * step
}

const SUBTITLE = /^(?:T|P|TP|PL|OT)\d*\s*[-.]|^(?:sala|room|aula|anf|lab)\b|^\d{1,3}(?:[.-]\d{1,3}){1,3}$/i

function findBoxFor(boxes, col, textBox) {
  if (!boxes?.length) return null
  const candidates = boxes.filter(b => {
    const cx = (b.x0 + b.x1) / 2
    const spansColumn = b.x0 <= col.centre && b.x1 >= col.centre
    const insideColumn = cx >= col.left && cx < col.right
    if (!spansColumn && !insideColumn) return false
    return b.y0 <= textBox.y0 + 6 && b.y1 >= textBox.y1 - 6
  })
  if (!candidates.length) return null
  const textMid = (textBox.y0 + textBox.y1) / 2
  return candidates
    .filter(b => textMid >= b.y0 && textMid <= b.y1)
    .sort((a, b) => (a.y1 - a.y0) - (b.y1 - b.y0))[0] ?? null
}

export function buildRowsFromLines(words, { defaultDurationMinutes = 60, rowGapPx, boxes } = {}) {
  const columns = findDayColumns(words)
  const scale = findTimeScale(words)
  if (!columns.length) return { rows: [], columns, scale, reason: 'no-days' }
  if (!scale) return { rows: [], columns, scale, reason: 'no-times' }

  const headerBottom = Math.max(...columns.map(c => c.headerBottom ?? 0))
  const body = words.filter(w => (
    w.y0 > headerBottom + 12 &&
    w.x0 > scale.gutterRight &&
    parseGutterTime(w.text) == null
  ))

  const hourPx = 60 / scale.minutesPerPixel
  const gap = rowGapPx ?? hourPx * 0.55

  const rows = []
  for (const col of columns) {
    const mine = body.filter(w => {
      const cx = centreX(w)
      return cx >= col.left && cx < col.right
    })
    if (!mine.length) continue

    const lines = groupColumnWords(mine)

    const clusters = []
    for (const line of lines) {
      const open = clusters[clusters.length - 1]
      if (open && line.y0 - open.y1 < gap) {
        open.lines.push(line)
        open.y1 = Math.max(open.y1, line.y1)
      } else {
        clusters.push({ y0: line.y0, y1: line.y1, lines: [line] })
      }
    }

    for (const box of clusters) {
      const titleLines = []
      const noteLines = []
      for (const line of box.lines) {
        const target = SUBTITLE.test(line.text.trim()) || titleLines.length ? noteLines : titleLines
        target.push(line.text.trim())
      }
      if (!titleLines.length) continue

      const split = splitTitleAndNote(titleLines.join(' '))
      const note = [split.note, ...noteLines].filter(Boolean).join(' - ')

      const drawn = findBoxFor(boxes, col, box)
      let start
      let end
      if (drawn) {
        start = snap(scale.originMinutes + (drawn.y0 - scale.originY) * scale.minutesPerPixel)
        end = snap(scale.originMinutes + (drawn.y1 - scale.originY) * scale.minutesPerPixel)
      } else {
        const titleHeight = box.lines[0].y1 - box.lines[0].y0
        start = snap(scale.originMinutes + (box.y0 - titleHeight - scale.originY) * scale.minutesPerPixel)
        end = snap(scale.originMinutes + (box.y1 + titleHeight - scale.originY) * scale.minutesPerPixel)
      }
      if (end <= start) end = start + defaultDurationMinutes

      rows.push({
        dayIndex: col.dayIndex,
        startTime: minutesToTime(start),
        endTime: minutesToTime(Math.max(end, start + 30)),
        title: split.title,
        note,
        color: drawn?.color ?? null,
      })
    }
  }

  rows.sort((a, b) => a.dayIndex - b.dayIndex || a.startTime.localeCompare(b.startTime))
  return { rows, columns, scale, reason: rows.length ? null : 'no-boxes' }
}
