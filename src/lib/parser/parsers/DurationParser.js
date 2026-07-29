import { Parser } from './Parser.js'
import { Trie } from '../Trie.js'
import { NumberParser } from './NumberParser.js'
import { getPrepositions } from './EntityParser.js'
import { dictWithEnglishFallback } from '../localeDict.js'

export class DurationParser extends Parser {
  constructor() {
    super()
    this.trieCache = new Map()
    this.numberParser = new NumberParser()
  }

  getTrie(locale) {
    if (this.trieCache.has(locale)) return this.trieCache.get(locale)

    const trie = new Trie()
    for (const [word, val] of Object.entries(dictWithEnglishFallback(locale, 'durations'))) {
      trie.addPhrase(word, val)
    }
    this.trieCache.set(locale, trie)
    return trie
  }

  parse(tokens, context) {
    const trie = this.getTrie(context.locale)
    const durations = trie.searchTokens(tokens)
    const numbers = this.numberParser.parse(tokens, context)
    const forWords = getPrepositions(context.locale).for

    const results = []

    for (const d of durations) {
      const num = numbers.find(n => n.endToken === d.startToken - 1)
      if (num) {
        let valMinutes = 0
        if (d.value === 'hour') valMinutes = num.value * 60
        else if (d.value === 'minute') valMinutes = num.value

        let startToken = num.startToken
        if (startToken > 0) {
          const prevToken = tokens[startToken - 1]
          if (prevToken && !prevToken.consumed && forWords.includes(prevToken.value)) {
            startToken -= 1
          }
        }

        results.push({
          startToken,
          endToken: d.endToken,
          value: valMinutes,
          type: 'duration',
          confidence: 0.95
        })
      }
    }

    return results
  }
}
