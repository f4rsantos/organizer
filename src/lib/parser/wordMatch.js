import { en } from './locales/en.js'

const WORD_CHAR = '[\\p{L}\\p{N}_]'

export function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function wordBoundaryRe(phrase, flags = 'gi') {
  const body = escapeRe(phrase).replace(/\s+/g, '\\s+')
  return new RegExp(`(?<!${WORD_CHAR})${body}(?!${WORD_CHAR})`, `${flags}u`)
}

export function hasPhrase(text, phrase) {
  return wordBoundaryRe(phrase, 'i').test(text)
}

export function findPhrase(text, phrases) {
  return (phrases ?? []).find(p => hasPhrase(text, p))
}

export function stripPhrase(text, phrase, replacement = ' ') {
  return text.replace(wordBoundaryRe(phrase, 'gi'), replacement)
}

export function stripFirstPhrase(text, phrase, replacement = ' ') {
  return text.replace(wordBoundaryRe(phrase, 'i'), replacement)
}

function dedupeLower(...lists) {
  return [...new Set(lists.flat().filter(Boolean).map(w => w.toLowerCase()))]
}

export function mergeWordGroups(key, locale) {
  const defaults = en[key] ?? {}
  const extra = locale?.[key] ?? {}
  const merged = {}
  for (const group of new Set([...Object.keys(defaults), ...Object.keys(extra)])) {
    merged[group] = dedupeLower(defaults[group] ?? [], extra[group] ?? [])
  }
  return merged
}

export function mergeWordList(key, locale) {
  return dedupeLower(en[key] ?? [], locale?.[key] ?? [])
}
