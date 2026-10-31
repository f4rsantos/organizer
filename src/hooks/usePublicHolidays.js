import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { readDevicePref, writeDevicePref } from '@/lib/devicePrefs'
import { fetchPublicHolidays, localizeHolidays } from '@/lib/publicHolidays'

const EMPTY = []
const YEARS_AHEAD = 1

function cacheKey(country, year) {
  return `openHolidays:${country}:${year}`
}

function yearsToCover() {
  const year = new Date().getFullYear()
  return Array.from({ length: YEARS_AHEAD + 1 }, (_, i) => year + i)
}

function cachedHolidays(country) {
  return yearsToCover().flatMap(year => readDevicePref(cacheKey(country, year), []))
}

export function usePublicHolidays() {
  const enabled = useStore(s => s.settings?.publicHolidays?.enabled === true)
  const savedCountry = useStore(s => s.settings?.publicHolidays?.country ?? '')
  const lang = useStore(s => s.lang ?? 'en')
  const country = enabled ? savedCountry : ''
  const [loaded, setLoaded] = useState(null)
  const cached = useMemo(() => (country ? cachedHolidays(country) : EMPTY), [country])

  useEffect(() => {
    if (!country) return
    let cancelled = false
    const missing = yearsToCover().filter(year => readDevicePref(cacheKey(country, year)) == null)
    if (!missing.length) return
    Promise.all(missing.map(async year => writeDevicePref(cacheKey(country, year), await fetchPublicHolidays(country, year))))
      .then(() => { if (!cancelled) setLoaded({ country, list: cachedHolidays(country) }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [country])

  const raw = loaded?.country === country ? loaded.list : cached
  return useMemo(() => localizeHolidays(raw, lang), [raw, lang])
}
