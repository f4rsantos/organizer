import { Parser } from './Parser.js'
import { Trie } from '../Trie.js'
import { dictWithEnglishFallback } from '../localeDict.js'
import { parseCompoundNumber } from '../compoundNumbers.js'

export class NumberParser extends Parser {
  constructor() {
    super()
    this.trieCache = new Map()
  }

  getTrie(locale) {
    if (this.trieCache.has(locale)) return this.trieCache.get(locale)

    const trie = new Trie()
    for (const [word, val] of Object.entries(dictWithEnglishFallback(locale, 'numbers'))) {
      trie.addPhrase(word, { value: val, isOrdinal: false })
    }
    for (const [word, val] of Object.entries(dictWithEnglishFallback(locale, 'ordinals'))) {
      trie.addPhrase(word, { value: val, isOrdinal: true })
    }
    this.trieCache.set(locale, trie)
    return trie
  }

  findSpacedCompounds(tokens, numbers, joiners) {
    if (!joiners?.length) return []

    const found = []
    for (let i = 0; i + 2 < tokens.length; i++) {
      const [a, joiner, b] = [tokens[i], tokens[i + 1], tokens[i + 2]]
      if (!joiners.includes(joiner.value)) continue

      const value = parseCompoundNumber(`${a.value}${joiner.value}${b.value}`, numbers, joiners)
      if (value === null) continue

      found.push({
        startToken: a.index,
        endToken: b.index,
        value,
        isOrdinal: false,
        type: 'number',
        confidence: 0.9,
      })
      i += 2
    }
    return found
  }

  parse(tokens, context) {
    const trie = this.getTrie(context.locale)
    const matches = trie.searchTokens(tokens)

    const numbers = dictWithEnglishFallback(context.locale, 'numbers')
    const joiners = context.locale?.compoundJoiners
    const unconsumed = tokens.filter(t => !t.consumed)

    const spaced = this.findSpacedCompounds(unconsumed, numbers, joiners)
    const spannedByCompound = new Set()
    for (const c of spaced) {
      for (let i = c.startToken; i <= c.endToken; i++) spannedByCompound.add(i)
    }

    const results = [...spaced]
    const matchedTokens = new Set(spannedByCompound)

    for (const m of matches) {
      let overlaps = false
      for (let i = m.startToken; i <= m.endToken; i++) {
        if (spannedByCompound.has(i)) overlaps = true
      }
      if (overlaps) continue

      results.push({
        startToken: m.startToken,
        endToken: m.endToken,
        value: m.value.value,
        isOrdinal: m.value.isOrdinal,
        type: 'number',
        confidence: 0.9
      })
      for (let i = m.startToken; i <= m.endToken; i++) matchedTokens.add(i)
    }

    for (const t of unconsumed) {
      if (/^\d+$/.test(t.value)) {
        results.push({
          startToken: t.index,
          endToken: t.index,
          value: parseInt(t.value, 10),
          isOrdinal: false,
          type: 'number',
          confidence: 0.9
        })
        continue
      }

      if (matchedTokens.has(t.index)) continue

      const compound = parseCompoundNumber(t.value, numbers, joiners)
      if (compound !== null) {
        results.push({
          startToken: t.index,
          endToken: t.index,
          value: compound,
          isOrdinal: false,
          type: 'number',
          confidence: 0.9
        })
      }
    }
    return results
  }
}
