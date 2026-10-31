import { messageSeed } from '../habitMessages.js'
import { timeOfDayKeys, weatherGreetingKeys } from '../greetings.js'

const GENERAL_MILESTONES = ['daily', 'early']

function pickFor(list, seedKey) {
  if (!list.length) return null
  return list[messageSeed('today', seedKey) % list.length]
}

function textsFor(t, keys) {
  return keys.map(key => t?.[key]).filter(text => typeof text === 'string' && text)
}

export function dailyGreeting(t, { today, hour, weatherCategory }) {
  const timeKeys = timeOfDayKeys(hour)
  const keys = [...timeKeys, ...weatherGreetingKeys(weatherCategory)]
  return pickFor(textsFor(t, keys), `${today}:${timeKeys[0]}`)
}

export function dailyMotivation(t, today) {
  const tones = Object.values(t?.habitMessages ?? {})
  const phrases = tones.flatMap(tone => GENERAL_MILESTONES.map(milestone => tone?.[milestone])).filter(Boolean)
  return pickFor(phrases, `${today}:motivation`)
}
