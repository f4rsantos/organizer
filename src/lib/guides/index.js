import { en } from './en'
import { pt } from './pt'
import { fr } from './fr'
import { de } from './de'
import { es } from './es'
import { af } from './af'
import { cs } from './cs'
import { pirate } from './pirate'

export const GUIDE_STRINGS = { en, pt, fr, de, es, af, cs, pirate }

// Order and grouping of the guide list. Entry ids match keys in each locale.
export const GUIDE_SECTIONS = [
  { id: 'core', entries: ['tasks', 'kanban', 'grades', 'calendar', 'focus'] },
  { id: 'productivity', entries: ['notes', 'eisenhower', 'habits', 'quickAction'] },
  { id: 'sync', entries: ['googleCalendar', 'eiCalendar'] },
  { id: 'ambient', entries: ['pomodoro', 'standby'] },
  { id: 'sharing', entries: ['firebaseSync', 'collab', 'dataTransfer'] },
  { id: 'setup', entries: ['settings'] },
]

const MERGED = {}

// Falls back per entry rather than wholesale, so a partly translated locale
// still shows its finished guides and English for the rest.
function merge(locale) {
  const entries = {}
  Object.keys(en.entries).forEach(id => {
    entries[id] = locale.entries?.[id] ?? en.entries[id]
  })
  return {
    ...en,
    ...locale,
    sections: { ...en.sections, ...locale.sections },
    entries,
  }
}

export function useGuides(lang) {
  const locale = GUIDE_STRINGS[lang]
  if (!locale) return GUIDE_STRINGS.en
  if (!MERGED[lang]) MERGED[lang] = merge(locale)
  return MERGED[lang]
}
