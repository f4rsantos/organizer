export const LANGS = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'pt', label: 'Português', short: 'PT' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'de', label: 'Deutsch', short: 'DE' },
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'af', label: 'Afrikaans', short: 'AF', hidden: true },
  { code: 'cs', label: 'Čeština', short: 'CS' },
  { code: 'pirate', label: '☠ Pirate', short: '☠' },
]

export const HIDDEN_LANG_CODES = LANGS.filter(l => l.hidden).map(l => l.code)

export function visibleLangs() {
  return LANGS.filter(l => !l.hidden)
}
