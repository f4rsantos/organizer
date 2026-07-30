const SEPARATORS = /[\s-]+/g

function buildLookup(numbers) {
  const units = new Map()
  const tens = new Map()

  for (const [word, value] of Object.entries(numbers)) {
    if (!Number.isInteger(value)) continue
    const key = word.toLowerCase()
    if (value >= 1 && value <= 9) units.set(key, value)
    else if (value >= 20 && value <= 90 && value % 10 === 0) tens.set(key, value)
  }

  return { units, tens }
}

// "een" itself contains the joiner "en", so every split point must be tried.
function* splitsOnJoiner(word, joiners) {
  for (const joiner of joiners) {
    let from = 1
    while (from < word.length) {
      const at = word.indexOf(joiner, from)
      if (at === -1) break
      const head = word.slice(0, at)
      const tail = word.slice(at + joiner.length)
      if (head && tail) yield { head, tail }
      from = at + 1
    }
  }
}

export function parseCompoundNumber(word, numbers, joiners) {
  if (!joiners?.length || typeof word !== 'string') return null

  const cleaned = word.toLowerCase().replace(SEPARATORS, '')
  if (!cleaned) return null

  const { units, tens } = buildLookup(numbers)
  if (tens.has(cleaned) || units.has(cleaned)) return null

  for (const { head, tail } of splitsOnJoiner(cleaned, joiners)) {
    const unit = units.get(head)
    const ten = tens.get(tail)
    if (unit !== undefined && ten !== undefined) return ten + unit
  }

  return null
}

