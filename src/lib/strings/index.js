import { en } from './en'
import { pt } from './pt'
import { fr } from './fr'
import { de } from './de'
import { es } from './es'
import { af } from './af'
import { cs } from './cs'
import { pirate } from './pirate'

export const STRINGS = { en, pt, fr, de, es, af, cs, pirate }

const MERGED = {}
export function useStrings(lang) {
  if (!STRINGS[lang]) return STRINGS.en
  if (!MERGED[lang]) MERGED[lang] = { ...STRINGS.en, ...STRINGS[lang] }
  return MERGED[lang]
}
