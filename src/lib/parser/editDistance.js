export function editDistance(a, b, max = Infinity) {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  if (a.length > b.length) [a, b] = [b, a]

  let prev2 = new Array(a.length + 1)
  let prev = new Array(a.length + 1)
  let curr = new Array(a.length + 1)
  for (let i = 0; i <= a.length; i++) prev[i] = i

  for (let j = 1; j <= b.length; j++) {
    curr[0] = j
    let rowMin = curr[0]
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(prev[i] + 1, curr[i - 1] + 1, prev[i - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[i - 2] + 1)
      }
      curr[i] = v
      if (v < rowMin) rowMin = v
    }
    if (rowMin > max) return max + 1
    ;[prev2, prev, curr] = [prev, curr, prev2]
  }

  return prev[a.length]
}

export function maxEditsFor(word) {
  if (word.length <= 3) return 0
  if (word.length <= 6) return 1
  return 2
}

export function closestWord(word, candidates) {
  const max = maxEditsFor(word)
  if (max === 0) return null

  let best = null
  let bestDist = Infinity
  for (const cand of candidates) {
    const d = editDistance(word, cand, max)
    if (d <= max && d < bestDist) {
      best = cand
      bestDist = d
    }
  }
  return best
}
