import { describe, it, expect } from 'vitest'
import {
  timeOfDayKey,
  collectGreetingKeys,
  pickGreeting,
  getSessionGreetingKey,
  resetSessionGreetingKey,
  getSessionGreeting,
} from '../../../src/apps/aiAssistant/greetings'

describe('timeOfDayKey', () => {
  it('maps hours to the right time-of-day bucket', () => {
    expect(timeOfDayKey(2)).toBe('aiGreetingNight')
    expect(timeOfDayKey(8)).toBe('aiGreetingMorning')
    expect(timeOfDayKey(14)).toBe('aiGreetingAfternoon')
    expect(timeOfDayKey(20)).toBe('aiGreetingEvening')
  })

  it('treats boundary hours correctly', () => {
    expect(timeOfDayKey(5)).toBe('aiGreetingMorning')
    expect(timeOfDayKey(12)).toBe('aiGreetingAfternoon')
    expect(timeOfDayKey(18)).toBe('aiGreetingEvening')
    expect(timeOfDayKey(0)).toBe('aiGreetingNight')
  })
})

describe('collectGreetingKeys', () => {
  it('always includes the time-of-day and generic keys', () => {
    const keys = collectGreetingKeys({ hour: 9, todayWeatherCategory: null })
    expect(keys).toContain('aiGreetingMorning')
    expect(keys).toContain('aiGreetingMorning2')
    expect(keys).toContain('aiGreeting')
    expect(keys).toContain('aiGreetingGeneric2')
    expect(keys).toContain('aiGreetingGeneric3')
    expect(keys).toContain('aiGreetingGeneric4')
  })

  it('adds weather keys when a weather category is given', () => {
    const keys = collectGreetingKeys({ hour: 9, todayWeatherCategory: 'rain' })
    expect(keys).toContain('aiGreetingWeatherRain')
    expect(keys).toContain('aiGreetingWeatherRain2')
  })

  it('omits a weather key for an unrecognised category', () => {
    const keys = collectGreetingKeys({ hour: 9, todayWeatherCategory: 'nonsense' })
    expect(keys.some(k => k.startsWith('aiGreetingWeather'))).toBe(false)
  })
})

describe('pickGreeting', () => {
  const t = {
    aiGreetingMorning: 'Morning',
    aiGreetingMorning2: 'Morning 2',
    aiGreeting: 'Generic',
    aiGreetingGeneric2: 'Generic 2',
    aiGreetingGeneric3: 'Generic 3',
    aiGreetingGeneric4: 'Generic 4',
    aiGreetingWeatherRain: 'Rainy',
    aiGreetingWeatherRain2: 'Rainy 2',
  }

  it('picks deterministically with a fixed random source', () => {
    expect(pickGreeting({ hour: 9, todayWeatherCategory: null, t, random: () => 0 })).toBe('Morning')
  })

  it('only picks from keys that resolve to a real string in this locale', () => {
    const sparse = { aiGreeting: 'Generic' }
    expect(pickGreeting({ hour: 9, todayWeatherCategory: 'rain', t: sparse, random: () => 0 })).toBe('Generic')
  })

  it('falls back to aiGreeting when nothing resolves at all', () => {
    expect(pickGreeting({ hour: 9, todayWeatherCategory: null, t: {}, random: () => 0 })).toBe('')
  })

  it('can select the weather greeting when it lands last in the list', () => {
    const result = pickGreeting({ hour: 9, todayWeatherCategory: 'rain', t, random: () => 0.99 })
    expect(result).toBe('Rainy 2')
  })
})

describe('getSessionGreetingKey', () => {
  it('commits to one key until reset', () => {
    resetSessionGreetingKey()
    const first = getSessionGreetingKey({ hour: 9, todayWeatherCategory: null, random: () => 0 })
    const second = getSessionGreetingKey({ hour: 9, todayWeatherCategory: 'rain', random: () => 0.99 })
    expect(first).toBe(second)
  })

  it('resets when resetSessionGreetingKey is called', () => {
    resetSessionGreetingKey()
    const first = getSessionGreetingKey({ hour: 9, todayWeatherCategory: null, random: () => 0 })
    resetSessionGreetingKey()
    const second = getSessionGreetingKey({ hour: 9, todayWeatherCategory: 'rain', random: () => 0.99 })
    expect(first).not.toBe(second)
  })
})

describe('getSessionGreeting', () => {
  it('returns the same string across calls even if weather category changes', () => {
    resetSessionGreetingKey()
    const t = { aiGreetingMorning: 'Morning', aiGreetingWeatherRain: 'Rainy' }
    const first = getSessionGreeting(t, { hour: 9, todayWeatherCategory: null, random: () => 0 })
    const second = getSessionGreeting(t, { hour: 9, todayWeatherCategory: 'rain', random: () => 0.99 })
    expect(first).toBe('Morning')
    expect(second).toBe('Morning')
  })
})
