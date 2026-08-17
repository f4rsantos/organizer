export const HABIT_TONES = ['purpose', 'warm', 'upbeat', 'game']
export const TONE_RANDOM = 'random'
export const TONE_CUSTOM = 'custom'

export const HABIT_MILESTONES = ['day1', 'early', 'week', 'month', 'daily', 'rescue']

export function milestoneFor({ streak, total, rescued }) {
  if (rescued) return 'rescue'
  if (total <= 1) return 'day1'
  if (streak === 30) return 'month'
  if (streak === 7) return 'week'
  if (streak >= 2 && streak <= 6) return 'early'
  return 'daily'
}

export function messageSeed(habitKey, periodKey) {
  const input = `${habitKey ?? ''}:${periodKey ?? ''}`
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function pickTone(tone, seed) {
  if (tone !== TONE_RANDOM) return tone
  const index = Math.abs(Math.trunc(seed)) % HABIT_TONES.length
  return HABIT_TONES[index]
}

export function habitMessage({ t, tone, customMessage, streak, total, rescued, seed = 0 }) {
  if (tone === TONE_CUSTOM) return (customMessage ?? '').trim()

  const resolved = pickTone(tone, seed)
  const milestone = milestoneFor({ streak, total, rescued })
  const messages = t.habitMessages?.[resolved]
  if (!messages) return ''
  return messages[milestone] ?? messages.daily ?? ''
}
