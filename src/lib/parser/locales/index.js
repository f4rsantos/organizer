import { en } from './en.js'
import { pt } from './pt.js'
import { es } from './es.js'
import { fr } from './fr.js'
import { de } from './de.js'
import { cs } from './cs.js'
import { pirate } from './pirate.js'
import { af } from './af.js'

export const locales = {
  en, pt, es, fr, de, cs, pirate, af
}

export function getLocalePack(langCode) {
  return locales[langCode] || en
}
