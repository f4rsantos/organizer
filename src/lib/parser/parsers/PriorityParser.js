import { Parser } from './Parser.js'
import { Trie } from '../Trie.js'
import { en } from '../locales/en.js'
import { mergeWordGroups } from '../wordMatch.js'

export function getPriorityWords(locale) {
  return mergeWordGroups('priorityWords', locale)
}

export class PriorityParser extends Parser {
  constructor() {
    super()
    this.trieCache = new Map()
  }

  getTrie(locale) {
    const cacheKey = locale ?? en
    if (this.trieCache.has(cacheKey)) return this.trieCache.get(cacheKey)

    const trie = new Trie()
    trie.addPhrase('p1', { priority: 1 })
    trie.addPhrase('p2', { priority: 2 })
    trie.addPhrase('p3', { priority: 3 })
    trie.addPhrase('p4', { priority: 4 })

    for (const [level, phrases] of Object.entries(getPriorityWords(locale))) {
      for (const phrase of phrases ?? []) {
        trie.addPhrase(phrase, { priority: Number(level) })
      }
    }

    this.trieCache.set(cacheKey, trie)
    return trie
  }

  parse(tokens, context) {
    const results = []
    const trie = this.getTrie(context.locale)

    const matches = trie.searchTokens(tokens)
    for (const m of matches) {
      results.push({
        startToken: m.startToken,
        endToken: m.endToken,
        value: m.value.priority,
        type: 'priority',
        confidence: 0.95
      })
    }

    return results
  }
}
