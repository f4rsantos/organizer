import { parseQuickAction } from '../parser/quickActionParse.js'

function leftoverLength(items) {
  return items.reduce((sum, item) => sum + (item.title ?? '').length + (item.query ?? '').length, 0)
}

export function parseWithFallback(text, options, fallback) {
  const primary = parseQuickAction(text, options)
  if (!fallback || fallback.lang === options.lang || !primary.length) return primary
  const secondary = parseQuickAction(text, { ...options, lang: fallback.lang, t: fallback.t, locale: undefined })
  if (!secondary.length) return primary
  return leftoverLength(secondary) < leftoverLength(primary) ? secondary : primary
}
