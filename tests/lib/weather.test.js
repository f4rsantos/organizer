import { describe, it, expect } from 'vitest'
import { parseForecast } from '../../src/lib/weather.js'

const RESPONSE = {
  daily: {
    time: ['2026-10-14', '2026-10-15'],
    weathercode: [61, 0],
    temperature_2m_max: [18, 22],
    temperature_2m_min: [11, 9],
  },
  hourly: {
    time: ['2026-10-14T08:00', '2026-10-14T15:00', '2026-10-14T16:00', '2026-10-14T17:00', '2026-10-15T10:00'],
    precipitation_probability: [10, 40, 70, 90, 5],
  },
}

describe('parseForecast', () => {
  it('reports the first hour of each day when rain becomes likely', () => {
    expect(parseForecast(RESPONSE)).toEqual([
      { date: '2026-10-14', code: 61, max: 18, min: 11, rainFrom: '16:00' },
      { date: '2026-10-15', code: 0, max: 22, min: 9, rainFrom: null },
    ])
  })

  it('copes with a response that has no hourly data', () => {
    const { hourly: _hourly, ...dailyOnly } = RESPONSE
    expect(parseForecast(dailyOnly)[0].rainFrom).toBeNull()
  })
})
