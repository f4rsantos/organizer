import { describe, it, expect } from 'vitest'
import { dailyGreeting, dailyMotivation } from '../../../src/lib/today/dailyPhrases.js'
import { en } from '../../../src/lib/strings/en.js'

describe('dailyGreeting', () => {
  it('greets with a phrase for the time of day or the weather, never an assistant prompt', () => {
    const allowed = [en.aiGreetingMorning, en.aiGreetingMorning2, en.aiGreetingWeatherRain, en.aiGreetingWeatherRain2]
    for (const day of ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17']) {
      expect(allowed).toContain(dailyGreeting(en, { today: day, hour: 9, weatherCategory: 'rain' }))
    }
  })

  it('keeps the same greeting through the morning instead of changing on every visit', () => {
    const first = dailyGreeting(en, { today: '2026-10-14', hour: 8, weatherCategory: null })
    expect(dailyGreeting(en, { today: '2026-10-14', hour: 11, weatherCategory: null })).toBe(first)
  })
})

describe('dailyMotivation', () => {
  it('reuses the habits app phrases without the milestone ones that cite a streak length', () => {
    const general = Object.values(en.habitMessages).flatMap(tone => [tone.daily, tone.early])
    const phrases = ['2026-10-14', '2026-10-15', '2026-10-16'].map(today => dailyMotivation(en, today))
    phrases.forEach(phrase => expect(general).toContain(phrase))
  })
})
