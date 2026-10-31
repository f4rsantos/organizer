const TIME_OF_DAY_KEYS = {
  night: ['aiGreetingNight', 'aiGreetingNight2'],
  morning: ['aiGreetingMorning', 'aiGreetingMorning2'],
  afternoon: ['aiGreetingAfternoon', 'aiGreetingAfternoon2'],
  evening: ['aiGreetingEvening', 'aiGreetingEvening2'],
}

const WEATHER_GREETING_KEYS = {
  clear: ['aiGreetingWeatherClear', 'aiGreetingWeatherClear2'],
  'partly-cloudy': ['aiGreetingWeatherCloudy', 'aiGreetingWeatherCloudy2'],
  cloudy: ['aiGreetingWeatherCloudy', 'aiGreetingWeatherCloudy2'],
  fog: ['aiGreetingWeatherFog', 'aiGreetingWeatherFog2'],
  rain: ['aiGreetingWeatherRain', 'aiGreetingWeatherRain2'],
  snow: ['aiGreetingWeatherSnow', 'aiGreetingWeatherSnow2'],
  storm: ['aiGreetingWeatherStorm', 'aiGreetingWeatherStorm2'],
}

export function timeOfDayKeys(hour) {
  if (hour < 5) return TIME_OF_DAY_KEYS.night
  if (hour < 12) return TIME_OF_DAY_KEYS.morning
  if (hour < 18) return TIME_OF_DAY_KEYS.afternoon
  return TIME_OF_DAY_KEYS.evening
}

export function weatherGreetingKeys(weatherCategory) {
  return WEATHER_GREETING_KEYS[weatherCategory] ?? []
}
