import { closestWord } from './editDistance.js'

const META_KEYS = new Set(['_isEnd', '_value'])

function childKeys(node) {
  return Object.keys(node).filter(k => !META_KEYS.has(k))
}

export class Trie {
  constructor({ fuzzy = false } = {}) {
    this.root = {}
    this.fuzzy = fuzzy
  }

  add(sequence, value) {
    if (!sequence || sequence.length === 0) return
    let node = this.root
    for (const word of sequence) {
      const w = word.toLowerCase()
      if (!node[w]) node[w] = {}
      node = node[w]
    }
    node._isEnd = true
    node._value = value
  }

  addPhrase(phrase, value) {
    if (!phrase) return
    const sequence = phrase.toLowerCase().split(/\s+/)
    this.add(sequence, value)
  }

  #walkExact(unconsumed, start) {
    let node = this.root
    let lastMatch = null
    const matchedIndices = []

    for (let j = start; j < unconsumed.length; j++) {
      const w = unconsumed[j].value
      if (!node[w]) break
      node = node[w]
      matchedIndices.push(unconsumed[j].index)
      if (node._isEnd) {
        lastMatch = {
          startToken: unconsumed[start].index,
          endToken: unconsumed[j].index,
          matchedTokens: [...matchedIndices],
          value: node._value,
        }
      }
    }
    return lastMatch
  }

  #walkFuzzy(unconsumed, start) {
    let node = this.root
    let lastMatch = null
    let usedFuzzy = false
    const matchedIndices = []

    for (let j = start; j < unconsumed.length; j++) {
      const w = unconsumed[j].value
      let key = node[w] ? w : null

      if (!key) {
        if (usedFuzzy) break
        const near = closestWord(w, childKeys(node))
        if (!near) break
        key = near
        usedFuzzy = true
      }

      node = node[key]
      matchedIndices.push(unconsumed[j].index)
      if (node._isEnd) {
        lastMatch = {
          startToken: unconsumed[start].index,
          endToken: unconsumed[j].index,
          matchedTokens: [...matchedIndices],
          value: node._value,
          fuzzy: usedFuzzy,
        }
      }
    }
    return lastMatch
  }

  searchTokens(tokens) {
    const unconsumed = tokens.filter(t => !t.consumed)
    const matches = []

    for (let i = 0; i < unconsumed.length; i++) {
      let match = this.#walkExact(unconsumed, i)
      if (!match && this.fuzzy) match = this.#walkFuzzy(unconsumed, i)
      if (match) matches.push(match)
    }

    return matches
  }
}
