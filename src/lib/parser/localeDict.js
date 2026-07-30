import { en } from './locales/en.js'

export function dictWithEnglishFallback(locale, key) {
  const base = en[key] ?? {}
  if (!locale || locale === en) return base
  return { ...base, ...(locale[key] ?? {}) }
}
