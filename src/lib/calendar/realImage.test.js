import { describe, it, expect } from 'vitest'
import fs from 'fs'
import { PNG } from 'pngjs'
import { buildRowsFromLines } from './scheduleGrid'
import { detectBoxes, mergeAdjacentBoxes } from './scheduleBoxes'

const words = JSON.parse(fs.readFileSync('src/lib/calendar/__words.json', 'utf8'))

const EXPECTED = [
  { dayIndex: 0, startTime: '14:00', endTime: '16:00', title: 'IA' },
  { dayIndex: 0, startTime: '16:00', endTime: '18:00', title: 'IA' },
  { dayIndex: 1, startTime: '14:00', endTime: '16:00', title: 'TQS' },
  { dayIndex: 1, startTime: '16:00', endTime: '19:00', title: 'PEI' },
  { dayIndex: 2, startTime: '09:00', endTime: '11:00', title: 'CD' },
  { dayIndex: 2, startTime: '11:00', endTime: '13:00', title: 'CD' },
  { dayIndex: 2, startTime: '14:00', endTime: '15:00', title: 'TQS' },
  { dayIndex: 3, startTime: '11:00', endTime: '13:00', title: 'SIO' },
  { dayIndex: 3, startTime: '16:00', endTime: '18:00', title: 'SIO' },
]

function boxesFromImage() {
  const png = PNG.sync.read(fs.readFileSync('docs/image.png'))
  return mergeAdjacentBoxes(detectBoxes({ data: png.data, width: png.width, height: png.height }))
}

describe('real timetable screenshot', () => {
  const { rows } = buildRowsFromLines(words, { boxes: boxesFromImage() })

  it('finds every event', () => {
    expect(rows).toHaveLength(EXPECTED.length)
  })

  it('reads day, times and title from the drawn boxes', () => {
    rows.forEach((row, i) => {
      expect({
        dayIndex: row.dayIndex, startTime: row.startTime,
        endTime: row.endTime, title: row.title,
      }).toEqual(EXPECTED[i])
    })
  })

  it('puts room codes in the note, never the title', () => {
    for (const row of rows) {
      expect(row.note).toBeTruthy()
      expect(row.title).not.toMatch(/\d\.\d/)
    }
  })
})
