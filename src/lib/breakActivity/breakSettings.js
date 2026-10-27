import { SUDOKU_DIFFICULTIES } from './sudoku'

export const BREAK_ACTIVITY_MODES = ['sudoku', 'link']

const WEB_PROTOCOLS = ['http:', 'https:']
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i

export function defaultBreakActivity() {
  return { enabled: false, mode: 'sudoku', url: '', difficulty: 'medium' }
}

export function normalizeBreakUrl(raw) {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return null
  const candidate = SCHEME_PATTERN.test(text) ? text : `https://${text}`
  try {
    const url = new URL(candidate)
    if (!WEB_PROTOCOLS.includes(url.protocol) || !url.hostname) return null
    return url.href
  } catch {
    return null
  }
}

export function normalizeBreakActivitySettings(value) {
  const v = value && typeof value === 'object' ? value : {}
  const fallback = defaultBreakActivity()
  return {
    enabled: v.enabled === true,
    mode: BREAK_ACTIVITY_MODES.includes(v.mode) ? v.mode : fallback.mode,
    url: typeof v.url === 'string' ? v.url : fallback.url,
    difficulty: SUDOKU_DIFFICULTIES.includes(v.difficulty) ? v.difficulty : fallback.difficulty,
  }
}
