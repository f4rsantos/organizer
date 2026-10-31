const MAX_NAME_CHARS = 40

const SECTION_DEFAULTS = { showOnOpen: true, showWeather: true, showMotivation: true, showNotes: true, showSchedule: true, showUpcoming: true }
const SOURCE_DEFAULTS = { exams: true, events: true, tasks: true, cards: true }
export const HEADLINE_COUNTS = [1, 2, 3]
const RECOMMEND_DEFAULTS = { study: true, tasks: true, kanban: true, rest: true }

function booleansOver(defaults, value) {
  return Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [key, typeof value?.[key] === 'boolean' ? value[key] : fallback]),
  )
}

export function normalizeTodaySettings(value) {
  const name = typeof value?.name === 'string' ? value.name.trim().slice(0, MAX_NAME_CHARS) : ''
  return {
    name,
    headlineCount: HEADLINE_COUNTS.includes(value?.headlineCount) ? value.headlineCount : HEADLINE_COUNTS[0],
    ...booleansOver(SECTION_DEFAULTS, value),
    recommend: booleansOver(RECOMMEND_DEFAULTS, value?.recommend),
    highlightSources: booleansOver(SOURCE_DEFAULTS, value?.highlightSources),
  }
}
