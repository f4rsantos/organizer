export class Trie {
  constructor() {
    this.root = {}
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

  searchTokens(tokens) {
    const unconsumed = tokens.filter(t => !t.consumed)
    const matches = []

    for (let i = 0; i < unconsumed.length; i++) {
      let node = this.root
      let lastMatch = null
      let matchedIndices = []

      for (let j = i; j < unconsumed.length; j++) {
        const w = unconsumed[j].value
        if (!node[w]) break
        node = node[w]
        matchedIndices.push(unconsumed[j].index)
        if (node._isEnd) {
          lastMatch = {
            startToken: unconsumed[i].index,
            endToken: unconsumed[j].index,
            matchedTokens: [...matchedIndices],
            value: node._value
          }
        }
      }
      if (lastMatch) {
        matches.push(lastMatch)
      }
    }

    return matches
  }
}
