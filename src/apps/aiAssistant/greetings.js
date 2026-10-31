import { timeOfDayKeys, weatherGreetingKeys } from '@/lib/greetings'

export function timeOfDayKey(hour) {
  return timeOfDayKeys(hour)[0]
}

const GENERIC_GREETING_KEYS = [
  'aiGreeting',
  'aiGreetingGeneric2',
  'aiGreetingGeneric3',
  'aiGreetingGeneric4',
]

export function collectGreetingKeys({ hour, todayWeatherCategory }) {
  const keys = [...timeOfDayKeys(hour), ...GENERIC_GREETING_KEYS]
  return [...keys, ...weatherGreetingKeys(todayWeatherCategory)]
}

export function pickGreeting({ hour, todayWeatherCategory, t, random = Math.random }) {
  const keys = collectGreetingKeys({ hour, todayWeatherCategory })
  const available = keys.filter(key => typeof t?.[key] === 'string' && t[key].length > 0)
  if (!available.length) return t?.aiGreeting ?? ''
  const index = Math.floor(random() * available.length)
  return t[available[index]]
}

let sessionGreetingKey = null

export function getSessionGreetingKey({ hour = new Date().getHours(), todayWeatherCategory = null, random = Math.random } = {}) {
  if (!sessionGreetingKey) {
    const keys = collectGreetingKeys({ hour, todayWeatherCategory })
    const index = Math.floor(random() * keys.length)
    sessionGreetingKey = keys[index] || 'aiGreeting'
  }
  return sessionGreetingKey
}

export function resetSessionGreetingKey() {
  sessionGreetingKey = null
}

export function getSessionGreeting(t, options = {}) {
  const key = getSessionGreetingKey(options)
  return t?.[key] || t?.aiGreeting || ''
}
