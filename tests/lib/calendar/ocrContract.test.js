import { describe, it, expect } from 'vitest'
import { buildRowsFromLines } from '../../../src/lib/calendar/scheduleGrid'

const HOUR_PX = 60

function word(text, x0, y0, { width = 40, height = 14 } = {}) {
  return { text, x0, y0, x1: x0 + width, y1: y0 + height }
}

function gutter(hour) {
  return word(`${String(hour).padStart(2, '0')}:00`, 10, (hour - 9) * HOUR_PX + 100, { width: 34 })
}

const RAW_WORDS = [
  word('MON', 200, 50),
  word('TUE', 400, 50),
  ...[9, 10, 11, 12, 13].map(gutter),
  word('ALGO', 200, 160),
  word('sala', 200, 178, { width: 30 }),
  word('BASE', 400, 220),
  word('P1', 400, 238, { width: 20 }),
]

function mapLikeOcrModule(raw) {
  return raw
    .filter(w => (w.text ?? '').trim() && w.bbox)
    .map(w => ({
      text: w.text,
      x0: w.bbox.x0, x1: w.bbox.x1,
      y0: w.bbox.y0, y1: w.bbox.y1,
    }))
}

describe('ocr to grid contract', () => {
  it('consumes the exact shape ocrScheduleImage emits', () => {
    const tesseractShape = RAW_WORDS.map(w => ({
      text: w.text,
      bbox: { x0: w.x0, y0: w.y0, x1: w.x1, y1: w.y1 },
    }))
    const mapped = mapLikeOcrModule(tesseractShape)
    const { rows, reason } = buildRowsFromLines(mapped)
    expect(reason).toBeNull()
    expect(rows.length).toBeGreaterThan(0)
  })

  it('fails loudly if given grouped lines instead of words', () => {
    const grouped = [{ text: 'MON', words: [], x0: 200, y0: 57, x1: 251, y1: 74 }]
    const { rows } = buildRowsFromLines(grouped)
    expect(rows).toHaveLength(0)
  })
})
