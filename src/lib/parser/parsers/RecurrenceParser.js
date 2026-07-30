import { Parser } from './Parser.js'
import { Trie } from '../Trie.js'
import { NumberParser } from './NumberParser.js'
import { dictWithEnglishFallback } from '../localeDict.js'

export class RecurrenceParser extends Parser {
  constructor() {
    super()
    this.trieCache = new Map()
    this.numberParser = new NumberParser()
  }

  getTrie(locale) {
    if (this.trieCache.has(locale)) return this.trieCache.get(locale)

    const trie = new Trie()
    for (const [word, val] of Object.entries(dictWithEnglishFallback(locale, 'recurrences'))) {
      trie.addPhrase(word, val)
    }
    for (const [word, val] of Object.entries(dictWithEnglishFallback(locale, 'weekdays'))) {
      trie.addPhrase(word, { type: 'weekday', val })
    }
    this.trieCache.set(locale, trie)
    return trie
  }

  parse(tokens, context) {
    const trie = this.getTrie(context.locale)
    const matches = trie.searchTokens(tokens)
    const numbers = this.numberParser.parse(tokens, context)

    const results = []

    for (const m of matches) {
      // Interval-less entries ("dia", "mes") are only targets for an "every"-style word; on
      // their own they're ordinary nouns ("dia 20/07").
      if (m.value && m.value.freq && m.value.interval != null) {
        results.push({
          startToken: m.startToken,
          endToken: m.endToken,
          value: { freq: m.value.freq, interval: m.value.interval },
          type: 'recurrence',
          confidence: 0.95
        })
      }
    }

    const everyMatches = matches.filter(m => m.value === 'every')
    for (const every of everyMatches) {
      let currentIdx = every.endToken + 1
      if (currentIdx >= tokens.length || tokens[currentIdx].consumed) continue

      let interval = 1
      // A word can be both an ordinal and a recurrence target (pt "segunda" is Monday and
      // "second"). Reading it as the interval would swallow the target, so only treat the
      // slot as a count when nothing else claims it.
      const num = numbers.find(n => n.startToken === currentIdx)
      if (num && !matches.some(m => m.startToken === currentIdx)) {
        interval = num.value
        currentIdx = num.endToken + 1
      }

      if (currentIdx >= tokens.length || tokens[currentIdx].consumed) continue

      let targetMatch = matches.find(m => m.startToken === currentIdx)
      if (!targetMatch && currentIdx + 1 < tokens.length && !tokens[currentIdx].consumed) {
        // Tolerate one filler word between "every" and the target, e.g. "every single monday"
        targetMatch = matches.find(m => m.startToken === currentIdx + 1)
      }
      if (targetMatch) {
        if (targetMatch.value.type === 'weekday') {
          results.push({
            startToken: every.startToken,
            endToken: targetMatch.endToken,
            value: { freq: 'weekly', interval, weekday: targetMatch.value.val },
            type: 'recurrence',
            confidence: 0.98
          })
        } else if (targetMatch.value.freq) {
          results.push({
            startToken: every.startToken,
            endToken: targetMatch.endToken,
            value: { freq: targetMatch.value.freq, interval },
            type: 'recurrence',
            confidence: 0.98
          })
        }
      }
    }

    return results
  }
}
