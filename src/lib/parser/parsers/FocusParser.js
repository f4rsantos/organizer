import { escapeRe, mergeWordGroups } from '../wordMatch.js'

const WORD_CHAR = '[\\p{L}\\p{N}_]'
const VERB_SUFFIXES = '(?:ar|er|ir|a|e|o|ou|ei|am|em)?'

function buildDurationRe(words) {
  const units = [...words.hourUnits, ...words.minuteUnits].map(escapeRe)
  return new RegExp(`(\\d{1,3})\\s*(${units.join('|')})(?!${WORD_CHAR})`, 'giu')
}

function toMinutes(numStr, unit, words) {
  const isHour = words.hourUnits.some(u => u.toLowerCase() === unit.toLowerCase())
  return isHour ? Number(numStr) * 60 : Number(numStr)
}

function extractDurations(text, words) {
  const results = []
  const re = buildDurationRe(words)
  let m
  while ((m = re.exec(text))) {
    results.push({ minutes: toMinutes(m[1], m[2], words), index: m.index })
  }
  return results
}

function wordPattern(word) {
  const base = escapeRe(word)
  if (word.includes(' ')) return base
  const stem = word.replace(/(ar|er|ir)$/, '')
  if (stem === word || stem.length < 3) return base
  return `${escapeRe(stem)}${VERB_SUFFIXES}`
}

function hasWord(text, word) {
  return new RegExp(`(?<!${WORD_CHAR})${wordPattern(word)}(?!${WORD_CHAR})`, 'iu').test(text)
}

function findWord(text, words) {
  return words.find(w => hasWord(text, w))
}

function anyWord(text, words) {
  return words.some(w => hasWord(text, w))
}

function assignDurations(text, durations, breakWord) {
  if (durations.length === 0) return { workMins: null, breakMins: null }
  const breakIdx = text.indexOf(breakWord)
  if (breakIdx === -1 || durations.length === 1) {
    return { workMins: durations[0].minutes, breakMins: durations[1]?.minutes ?? null }
  }

  const before = durations.filter(d => d.index < breakIdx)
  const after = durations.filter(d => d.index >= breakIdx)

  if (before.length && after.length) {
    return { workMins: before[before.length - 1].minutes, breakMins: after[0].minutes }
  }
  return { workMins: durations[0].minutes, breakMins: durations[1]?.minutes ?? null }
}

export function parseFocusCommand(rawText, locale) {
  const text = rawText.trim().toLowerCase()
  if (!text) return null

  const words = mergeWordGroups('focusWords', locale)

  const hasFocusWord = anyWord(text, words.focus)
  const breakWord = findWord(text, words.break)
  if (!hasFocusWord && !breakWord) return null

  const startMatch = findWord(text, words.start)
  const resumeMatch = findWord(text, words.resume)
  const stopMatch = findWord(text, words.stop)
  const resetMatch = findWord(text, words.reset)
  const hasSkip = anyWord(text, words.skip)

  if (hasSkip && breakWord) return { action: 'skipBreak' }
  if (resetMatch && hasFocusWord) return { action: 'reset' }

  if (stopMatch && hasFocusWord && !startMatch) return { action: 'pause' }

  if (startMatch && hasFocusWord) {
    const isResume = resumeMatch && startMatch === resumeMatch
    const durations = extractDurations(text, words)
    if (durations.length === 0) {
      return { action: isResume ? 'resume' : 'start' }
    }
    const { workMins, breakMins } = assignDurations(text, durations, breakWord ?? 'break')
    return { action: isResume ? 'resume' : 'start', workMins, breakMins }
  }

  return null
}
