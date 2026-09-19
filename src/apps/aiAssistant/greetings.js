const TIME_OF_DAY_KEYS = {
  night: ['aiGreetingNight', 'aiGreetingNight2'],
  morning: ['aiGreetingMorning', 'aiGreetingMorning2'],
  afternoon: ['aiGreetingAfternoon', 'aiGreetingAfternoon2'],
  evening: ['aiGreetingEvening', 'aiGreetingEvening2'],
}

export function timeOfDayKeys(hour) {
  if (hour < 5) return TIME_OF_DAY_KEYS.night
  if (hour < 12) return TIME_OF_DAY_KEYS.morning
  if (hour < 18) return TIME_OF_DAY_KEYS.afternoon
  return TIME_OF_DAY_KEYS.evening
}

export function timeOfDayKey(hour) {
  return timeOfDayKeys(hour)[0]
}

const GENERIC_GREETING_KEYS = [
  'aiGreeting',
  'aiGreetingGeneric2',
  'aiGreetingGeneric3',
  'aiGreetingGeneric4',
]

const WEATHER_GREETING_KEYS = {
  clear: ['aiGreetingWeatherClear', 'aiGreetingWeatherClear2'],
  'partly-cloudy': ['aiGreetingWeatherCloudy', 'aiGreetingWeatherCloudy2'],
  cloudy: ['aiGreetingWeatherCloudy', 'aiGreetingWeatherCloudy2'],
  fog: ['aiGreetingWeatherFog', 'aiGreetingWeatherFog2'],
  rain: ['aiGreetingWeatherRain', 'aiGreetingWeatherRain2'],
  snow: ['aiGreetingWeatherSnow', 'aiGreetingWeatherSnow2'],
  storm: ['aiGreetingWeatherStorm', 'aiGreetingWeatherStorm2'],
}

export function collectGreetingKeys({ hour, todayWeatherCategory }) {
  const keys = [...timeOfDayKeys(hour), ...GENERIC_GREETING_KEYS]
  const weatherKeys = WEATHER_GREETING_KEYS[todayWeatherCategory]
  if (Array.isArray(weatherKeys)) keys.push(...weatherKeys)
  return keys
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
