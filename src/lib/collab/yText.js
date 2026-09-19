export function diffText(current, next) {
  if (current === next) return null

  let prefix = 0
  const maxPrefix = Math.min(current.length, next.length)
  while (prefix < maxPrefix && current[prefix] === next[prefix]) prefix += 1

  let suffix = 0
  const maxSuffix = Math.min(current.length, next.length) - prefix
  while (
    suffix < maxSuffix
    && current[current.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) suffix += 1

  return {
    index: prefix,
    deleteLength: current.length - prefix - suffix,
    insert: next.slice(prefix, next.length - suffix),
  }
}

export function applyTextDiff(ytext, next) {
  const patch = diffText(ytext.toString(), next ?? '')
  if (!patch) return false
  ytext.doc.transact(() => {
    if (patch.deleteLength > 0) ytext.delete(patch.index, patch.deleteLength)
    if (patch.insert.length > 0) ytext.insert(patch.index, patch.insert)
  })
  return true
}
