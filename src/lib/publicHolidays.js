const API_BASE = 'https://openholidaysapi.org'
const FALLBACK_LANGUAGE = 'EN'

function nameIn(names, lang) {
  const wanted = String(lang ?? '').toUpperCase()
  return (Array.isArray(names) ? names : []).find(entry => entry.language === wanted)?.text ?? null
}

function firstName(names) {
  return (Array.isArray(names) ? names[0]?.text : null) ?? ''
}

export function parsePublicHolidays(response, country) {
  if (!Array.isArray(response)) return []
  return response
    .filter(entry => entry?.startDate && entry.nationwide !== false)
    .map(entry => ({
      id: `public:${country}:${entry.startDate}`,
      names: entry.name,
      startDate: entry.startDate,
      endDate: entry.endDate ?? entry.startDate,
      public: true,
    }))
}

export function localizeHolidays(holidays, lang) {
  return holidays.map(({ names, ...holiday }) => ({ ...holiday, name: nameIn(names, lang) ?? firstName(names) }))
}

export function parseCountries(response, lang) {
  if (!Array.isArray(response)) return []
  return response
    .filter(entry => entry?.isoCode)
    .map(entry => ({ code: entry.isoCode, name: nameIn(entry.name, lang) ?? nameIn(entry.name, FALLBACK_LANGUAGE) ?? entry.isoCode }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchPublicHolidays(country, year) {
  const params = new URLSearchParams({ countryIsoCode: country, validFrom: `${year}-01-01`, validTo: `${year}-12-31` })
  const res = await fetch(`${API_BASE}/PublicHolidays?${params}`)
  if (!res.ok) throw new Error('public holidays failed')
  return parsePublicHolidays(await res.json(), country)
}

export async function fetchCountries(lang) {
  const res = await fetch(`${API_BASE}/Countries`)
  if (!res.ok) throw new Error('countries failed')
  return parseCountries(await res.json(), lang)
}
