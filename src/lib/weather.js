const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

export async function geocodeCity(city) {
  const params = new URLSearchParams({ name: city, count: '1', language: 'en', format: 'json' })
  const res = await fetch(`${GEOCODE_URL}?${params}`)
  if (!res.ok) throw new Error('geocode failed')
  const data = await res.json()
  const hit = data.results?.[0]
  if (!hit) return null
  return { lat: hit.latitude, lon: hit.longitude, name: hit.name, country: hit.country_code }
}

export async function fetchDailyForecast(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: 'weathercode,temperature_2m_max,temperature_2m_min',
    forecast_days: '7',
    timezone: 'auto',
  })
  const res = await fetch(`${FORECAST_URL}?${params}`)
  if (!res.ok) throw new Error('forecast failed')
  const data = await res.json()
  const days = data.daily?.time ?? []
  return days.map((date, i) => ({
    date,
    code: data.daily.weathercode[i],
    max: data.daily.temperature_2m_max[i],
    min: data.daily.temperature_2m_min[i],
  }))
}

export function weatherCategory(code) {
  if (code === 0) return 'clear'
  if ([1, 2].includes(code)) return 'partly-cloudy'
  if (code === 3) return 'cloudy'
  if ([45, 48].includes(code)) return 'fog'
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow'
  if ([95, 96, 99].includes(code)) return 'storm'
  return 'cloudy'
}
