import { weatherCategory } from '../weather.js'

const HOT_FROM_C = 30
const COLD_UNTIL_C = 3
const WEATHER_NOTE_KINDS = ['snow', 'storm']

function weatherNotes(day) {
  if (!day) return []
  const category = weatherCategory(day.code)
  return [
    day.rainFrom ? { kind: 'rain', from: day.rainFrom } : null,
    WEATHER_NOTE_KINDS.includes(category) ? { kind: category } : null,
    day.max >= HOT_FROM_C ? { kind: 'hot' } : null,
    day.min <= COLD_UNTIL_C ? { kind: 'cold' } : null,
  ].filter(Boolean)
}

export function dayNotes({ forecastDay, holiday, habitsPending }) {
  return [
    holiday ? { kind: 'holiday', name: holiday.name } : null,
    ...weatherNotes(forecastDay),
    habitsPending > 0 ? { kind: 'habits', count: habitsPending } : null,
  ].filter(Boolean)
}
