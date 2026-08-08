export const GOAL_TONES = ['purpose', 'warm', 'upbeat', 'game']
export const TONE_RANDOM = 'random'
export const TONE_CUSTOM = 'custom'

export const GOAL_MILESTONES = ['day1', 'early', 'week', 'month', 'daily', 'rescue']

export function milestoneFor({ streak, total, rescued }) {
  if (rescued) return 'rescue'
  if (total <= 1) return 'day1'
  if (streak === 30) return 'month'
  if (streak === 7) return 'week'
  if (streak >= 2 && streak <= 6) return 'early'
  return 'daily'
}

export function pickTone(tone, seed) {
  if (tone !== TONE_RANDOM) return tone
  const index = Math.abs(Math.trunc(seed)) % GOAL_TONES.length
  return GOAL_TONES[index]
}

export function goalMessage({ t, tone, customMessage, streak, total, rescued, seed = 0 }) {
  if (tone === TONE_CUSTOM) return (customMessage ?? '').trim()

  const resolved = pickTone(tone, seed)
  const milestone = milestoneFor({ streak, total, rescued })
  const messages = t.goalMessages?.[resolved]
  if (!messages) return ''
  return messages[milestone] ?? messages.daily ?? ''
}
