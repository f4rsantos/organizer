import { Parser } from './Parser.js'
import { matchUnconsumedTokens } from '../tokenizer.js'
import { Trie } from '../Trie.js'
import { NumberParser } from './NumberParser.js'
import { dictWithEnglishFallback } from '../localeDict.js'
import { escapeRe, mergeWordList } from '../wordMatch.js'

const MERIDIEM = String.raw`(am|pm|a\.m\.|p\.m\.)`
const HALF_DAY_HOURS = 12
const DASH_RANGE_RE = /^\d{1,2}(?:[:.]\d{2})?\s*h?\s*[-–]/
const TIME_MARKER_RE = /[:.h]|[ap]\.?m/i

function meridiemOf(raw) {
  if (!raw) return null
  return raw.toLowerCase().startsWith('p') ? 'pm' : 'am'
}

function applyMeridiem(hour, meridiem) {
  if (!meridiem || hour > HALF_DAY_HOURS) return hour
  if (meridiem === 'pm') return hour % HALF_DAY_HOURS + HALF_DAY_HOURS
  return hour % HALF_DAY_HOURS
}

function rangeHours(m) {
  const endMeridiem = meridiemOf(m[6])
  const startMeridiem = meridiemOf(m[3]) ?? endMeridiem
  const end = applyMeridiem(Number(m[4]), endMeridiem)
  let start = applyMeridiem(Number(m[1]), startMeridiem)
  if (!m[3] && endMeridiem === 'pm' && start > end) start = applyMeridiem(Number(m[1]), 'am')
  return { start, end }
}

export class TimeParser extends Parser {
  constructor() {
    super()
    this.trieCache = new Map()
    this.ampmCache = new Map()
    this.rangeCache = new Map()
    this.numberParser = new NumberParser()
  }

  getTrie(locale) {
    if (this.trieCache.has(locale)) return this.trieCache.get(locale)

    const trie = new Trie()
    for (const [word, val] of Object.entries(dictWithEnglishFallback(locale, 'time'))) {
      trie.addPhrase(word, val)
    }
    this.trieCache.set(locale, trie)
    return trie
  }

  getAttachedAmPm(locale) {
    if (this.ampmCache.has(locale)) return this.ampmCache.get(locale)

    const markers = new Map()
    for (const [word, val] of Object.entries(dictWithEnglishFallback(locale, 'time'))) {
      if ((val === 'am' || val === 'pm') && !/\s/.test(word)) markers.set(word.toLowerCase(), val)
    }

    const alternation = [...markers.keys()]
      .sort((a, b) => b.length - a.length)
      .map(escapeRe)
      .join('|')

    const entry = {
      markers,
      re: alternation ? new RegExp(`^(\\d{1,2})(${alternation})$`, 'iu') : null,
    }
    this.ampmCache.set(locale, entry)
    return entry
  }

  getRangeRe(locale) {
    if (this.rangeCache.has(locale)) return this.rangeCache.get(locale)
    const separators = ['-', '–', ...mergeWordList('timeRangeWords', locale)].map(escapeRe).join('|')
    const re = new RegExp(
      String.raw`(?<![\d:])(\d{1,2})(?:[:.](\d{2}))?\s*h?\s*${MERIDIEM}?\s*(?:${separators})\s*(\d{1,2})(?:[:.](\d{2}))?\s*h?\s*${MERIDIEM}?(?![\d\p{L}])`,
      'iu',
    )
    this.rangeCache.set(locale, re)
    return re
  }

  clamp2(n) {
    return String(n).padStart(2, '0')
  }

  toHHmm(h, m) {
    const hour = Number(h)
    if (hour < 0 || hour > 23) return null
    const min = m != null ? Number(m) : 0
    if (min < 0 || min > 59) return null
    return `${this.clamp2(hour)}:${this.clamp2(min)}`
  }

  combineHourMinute(hour, minute, ampmValue) {
    let h = hour
    let m = minute
    if (m < 0) {
      h -= 1
      m += 60
    }
    if (h < 0) h += 24
    if (ampmValue === 'pm' && h < 12) h += 12
    if (ampmValue === 'am' && h === 12) h = 0
    return this.toHHmm(h, m)
  }

  parse(tokens, context) {
    const results = []
    const atWords = mergeWordList('atWords', context.locale)
    const connectors = new Set(mergeWordList('timeConnectors', context.locale))
    const attachedAmPm = this.getAttachedAmPm(context.locale)

    const fromWords = mergeWordList('timeFromWords', context.locale)
    const rangeMatch = matchUnconsumedTokens(tokens, this.getRangeRe(context.locale))
    if (rangeMatch) {
      const m = rangeMatch.match
      const hours = rangeHours(m)
      const startTime = this.toHHmm(hours.start, m[2])
      const endTime = this.toHHmm(hours.end, m[5])
      if (startTime && endTime) {
        let startToken = rangeMatch.startToken
        const opener = tokens[startToken - 1]
        const opensRange = opener && !opener.consumed && (atWords.includes(opener.value) || fromWords.includes(opener.value))
        if (startToken > 0 && opensRange) startToken--
        let endToken = rangeMatch.endToken
        const closer = tokens[endToken + 1]
        const closesRange = closer && !closer.consumed && connectors.has(closer.value)
        if (closesRange) endToken++
        const looksLikeTime = DASH_RANGE_RE.test(m[0]) || TIME_MARKER_RE.test(m[0]) || opensRange || closesRange
        if (looksLikeTime) results.push({
          startToken,
          endToken,
          value: { startTime, endTime },
          type: 'time_range',
          confidence: 0.99
        })
      }
    }

    const trie = this.getTrie(context.locale)
    const modifiers = trie.searchTokens(tokens)
    const numbers = this.numberParser.parse(tokens, context)

    const unconsumed = tokens.filter(t => !t.consumed)

    // Some locales spell "at" as a run of words ("a las 15h"), so absorb every preceding one.
    const checkAt = (idx) => {
      let start = idx
      while (start > 0 && tokens[start-1] && atWords.includes(tokens[start-1].value) && !tokens[start-1].consumed) {
        start--
      }
      return start
    }

    for (let i = 0; i < unconsumed.length; i++) {
      const token = unconsumed[i]
      
      const strictMatch = token.value.match(/^(\d{1,2})[:.h](\d{2})$/i)
      if (strictMatch) {
        const startTime = this.toHHmm(strictMatch[1], strictMatch[2])
        if (startTime) {
          results.push({
            startToken: checkAt(token.index),
            endToken: token.index,
            value: { startTime },
            type: 'time_single',
            confidence: 0.95
          })
        }
        continue
      }
      
      // "15h" / "15hs" — hour with a unit suffix and no minutes.
      const bareHourMatch = token.value.match(/^(\d{1,2})h(?:s|rs?)?$/i)
      if (bareHourMatch) {
        const startTime = this.toHHmm(bareHourMatch[1], 0)
        if (startTime) {
          results.push({
            startToken: checkAt(token.index),
            endToken: token.index,
            value: { startTime },
            type: 'time_single',
            confidence: 0.95
          })
          continue
        }
      }

      const flatMatch = token.value.match(/^(\d{2})(\d{2})$/)
      if (flatMatch) {
        const h = Number(flatMatch[1])
        const m = Number(flatMatch[2])
        if (h <= 23 && m <= 59 && h >= 0) {
          results.push({
            startToken: checkAt(token.index),
            endToken: token.index,
            value: { startTime: this.toHHmm(h, m) },
            type: 'time_single',
            confidence: 0.9
          })
        }
        continue
      }

      const ampmAttached = attachedAmPm.re ? token.value.match(attachedAmPm.re) : null
      if (ampmAttached) {
        let h = Number(ampmAttached[1])
        const mod = attachedAmPm.markers.get(ampmAttached[2].toLowerCase())
        if (mod === 'pm' && h < 12) h += 12
        if (mod === 'am' && h === 12) h = 0
        if (h <= 23) {
          results.push({
            startToken: checkAt(token.index),
            endToken: token.index,
            value: { startTime: this.toHHmm(h, 0) },
            type: 'time_single',
            confidence: 0.96
          })
        }
        continue
      }
    }

    for (const num of numbers) {
      if (num.value < 0 || num.value > 23) continue

      const nextMod = modifiers.find(m => m.startToken === num.endToken + 1)
      if (nextMod && (nextMod.value === 'am' || nextMod.value === 'pm')) {
        results.push({
          startToken: checkAt(num.startToken),
          endToken: nextMod.endToken,
          value: { startTime: this.combineHourMinute(num.value, 0, nextMod.value) },
          type: 'time_single',
          confidence: 0.97
        })
      }

      const prevMod = modifiers.find(m => m.endToken === num.startToken - 1)
      if (prevMod && typeof prevMod.value === 'number') {
        const ampmMod = modifiers.find(m => m.startToken === num.endToken + 1 && (m.value === 'am' || m.value === 'pm'))
        results.push({
          startToken: checkAt(prevMod.startToken),
          endToken: ampmMod ? ampmMod.endToken : num.endToken,
          value: { startTime: this.combineHourMinute(num.value, prevMod.value, ampmMod?.value ?? null) },
          type: 'time_single',
          confidence: 0.98
        })
      }

      const nextValMod = modifiers.find(m => m.startToken === num.endToken + 1)
      if (nextValMod && typeof nextValMod.value === 'number') {
        const ampmMod = modifiers.find(m => m.startToken === nextValMod.endToken + 1 && (m.value === 'am' || m.value === 'pm'))
        results.push({
          startToken: checkAt(num.startToken),
          endToken: ampmMod ? ampmMod.endToken : nextValMod.endToken,
          value: { startTime: this.combineHourMinute(num.value, nextValMod.value, ampmMod?.value ?? null) },
          type: 'time_single',
          confidence: 0.98
        })
      }

      const nextNum = numbers.find(n => n.startToken === num.endToken + 2)
      if (nextNum) {
        const connectorToken = unconsumed.find(t => t.index === num.endToken + 1)
        if (connectorToken && connectors.has(connectorToken.value.toLowerCase())) {
          if (num.value >= 0 && num.value <= 23 && nextNum.value >= 0 && nextNum.value <= 59) {
            const ampmMod = modifiers.find(m => m.startToken === nextNum.endToken + 1 && (m.value === 'am' || m.value === 'pm'))
            results.push({
              startToken: checkAt(num.startToken),
              endToken: ampmMod ? ampmMod.endToken : nextNum.endToken,
              value: { startTime: this.combineHourMinute(num.value, nextNum.value, ampmMod?.value ?? null) },
              type: 'time_single',
              confidence: 0.97
            })
          }
        }
      }
    }

    for (const num of numbers) {
      if (num.value >= 1 && num.value <= 23) {
        if (num.startToken > 0 && atWords.includes(tokens[num.startToken - 1].value) && !tokens[num.startToken - 1].consumed) {
          results.push({
            startToken: num.startToken - 1,
            endToken: num.endToken,
            value: { startTime: this.toHHmm(num.value, 0) },
            type: 'time_single',
            confidence: 0.85
          })
        }
      }
    }

    return results
  }
}
