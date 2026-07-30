import { consumeTokens } from './tokenizer.js'

export class Pipeline {
  constructor(parsers = []) {
    this.parsers = parsers
  }

  execute(tokens, context) {
    let allMatches = []

    for (const parser of this.parsers) {
      const matches = parser.parse(tokens, context)
      if (matches) {
        allMatches.push(...matches)
      }
    }

    allMatches.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence
      }
      const lenA = a.endToken - a.startToken
      const lenB = b.endToken - b.startToken
      if (lenA !== lenB) {
        return lenB - lenA
      }
      return a.startToken - b.startToken
    })

    const results = []
    for (const match of allMatches) {
      let hasOverlap = false
      if (match.matchedTokens) {
        hasOverlap = match.matchedTokens.some(i => tokens[i].consumed)
      } else {
        for (let i = match.startToken; i <= match.endToken; i++) {
          if (tokens[i].consumed) {
            hasOverlap = true
            break
          }
        }
      }

      if (!hasOverlap) {
        if (match.matchedTokens) {
          for (const i of match.matchedTokens) {
            tokens[i].consumed = true
            tokens[i].type = match.type || 'pipeline_match'
          }
        } else {
          consumeTokens(tokens, match.startToken, match.endToken, match.type || 'pipeline_match')
        }
        results.push(match)
      }
    }

    return results
  }
}
