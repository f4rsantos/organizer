export function normalize(text) {
  return text.replace(/\s+/g, ' ').trim()
}

export function tokenize(text) {
  const norm = normalize(text)
  if (!norm) return []
  const tokens = []
  let offset = 0
  const rawTokens = norm.split(' ')
  for (let i = 0; i < rawTokens.length; i++) {
    const original = rawTokens[i]
    // Value strips surrounding punctuation for easy exact matching
    const value = original.toLowerCase().replace(/^[.,!?;:()\[\]]+|[.,!?;:()\[\]]+$/g, '')
    tokens.push({
      index: i,
      value,
      original,
      startChar: offset,
      endChar: offset + original.length,
      consumed: false,
      type: null
    })
    offset += original.length + 1
  }
  return tokens
}

export function consumeTokens(tokens, start, end, type) {
  for (let i = start; i <= end; i++) {
    tokens[i].consumed = true
    if (type) tokens[i].type = type
  }
}

export function getUnconsumedText(tokens) {
  return tokens.filter(t => !t.consumed).map(t => t.original).join(' ').trim()
}

/**
 * Utility to run a regex against the currently unconsumed tokens.
 * This maps the string match index back to the token span.
 */
export function matchUnconsumedTokens(tokens, regex) {
  const unconsumed = tokens.filter(t => !t.consumed)
  if (unconsumed.length === 0) return null
  
  let joined = ''
  const charToToken = []
  for (let i = 0; i < unconsumed.length; i++) {
    const t = unconsumed[i]
    const start = joined.length
    joined += t.original
    for (let c = start; c < joined.length; c++) {
      charToToken[c] = t
    }
    if (i < unconsumed.length - 1) {
      joined += ' '
      charToToken[joined.length - 1] = null
    }
  }

  const match = joined.match(regex)
  if (!match) return null

  const startIdx = match.index
  const endIdx = match.index + match[0].length - 1

  let startToken = charToToken[startIdx]
  if (!startToken) {
    let s = startIdx; while(s <= endIdx && !charToToken[s]) s++;
    startToken = charToToken[s]
  }

  let endToken = charToToken[endIdx]
  if (!endToken) {
    let e = endIdx; while(e >= startIdx && !charToToken[e]) e--;
    endToken = charToToken[e]
  }

  if (!startToken || !endToken) return null

  return {
    match,
    startToken: startToken.index,
    endToken: endToken.index
  }
}

/**
 * Find exact sequence of words in unconsumed tokens.
 * words array e.g. ['advanced', 'math']
 */
export function matchTokenSequence(tokens, words) {
  const unconsumed = tokens.filter(t => !t.consumed)
  if (words.length === 0 || unconsumed.length === 0) return null

  for (let i = 0; i <= unconsumed.length - words.length; i++) {
    let found = true
    for (let w = 0; w < words.length; w++) {
      if (unconsumed[i + w].value !== words[w].toLowerCase()) {
        found = false
        break
      }
    }
    if (found) {
      return {
        startToken: unconsumed[i].index,
        endToken: unconsumed[i + words.length - 1].index
      }
    }
  }
  return null
}
