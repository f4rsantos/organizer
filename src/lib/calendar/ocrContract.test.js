import { describe, it, expect } from 'vitest'
import fs from 'fs'
import { buildRowsFromLines } from './scheduleGrid'

const words = JSON.parse(fs.readFileSync('src/lib/calendar/__words.json', 'utf8'))

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
    const tesseractShape = words.map(w => ({
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
