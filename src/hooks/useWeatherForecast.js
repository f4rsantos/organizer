import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { geocodeCity, fetchDailyForecast } from '@/lib/weather'

const CACHE_TTL_MS = 60 * 60 * 1000
let cache = null

export function useWeatherForecast() {
  const enabled = useStore(s => s.settings?.weatherEnabled ?? false)
  const city = useStore(s => s.settings?.weatherCity ?? '')
  const coords = useStore(s => s.settings?.weatherCoords ?? null)
  const updateSettings = useStore(s => s.updateSettings)
  const [days, setDays] = useState(cache?.key === city ? cache.days : null)
  const inactive = !enabled || !city
  if (inactive && days !== null) setDays(null)

  useEffect(() => {
    if (!enabled || !city) return
    let cancelled = false

    const run = async () => {
      let point = coords
      if (!point || point.city !== city) {
        try {
          const geo = await geocodeCity(city)
          if (!geo) return
          point = { lat: geo.lat, lon: geo.lon, city }
          if (!cancelled) updateSettings({ weatherCoords: point })
        } catch {
          return
        }
      }

      if (cache?.key === city && cache.expires > Date.now()) {
        if (!cancelled) setDays(cache.days)
        return
      }

      try {
        const forecast = await fetchDailyForecast(point.lat, point.lon)
        cache = { key: city, expires: Date.now() + CACHE_TTL_MS, days: forecast }
        if (!cancelled) setDays(forecast)
      } catch {
        void 0
      }
    }

    run()
    return () => { cancelled = true }
  }, [enabled, city, coords, updateSettings])

  return days
}
