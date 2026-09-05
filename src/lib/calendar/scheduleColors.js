const FALLBACK = [
  '#6366f1', '#f97316', '#22c55e', '#3b82f6',
  '#ec4899', '#eab308', '#14b8a6', '#a855f7',
]

function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function matchClass(title, classes) {
  const key = normalize(title)
  if (!key || !classes?.length) return null
  const exact = classes.find(c => normalize(c.name) === key)
  if (exact) return exact
  return classes.find(c => {
    const n = normalize(c.name)
    return n && (n.startsWith(key) || key.startsWith(n))
  }) ?? null
}

export function resolveRowColors(rows, classes) {
  const byTitle = new Map()
  let nextFallback = 0

  return rows.map(row => {
    const key = normalize(row.title)
    if (byTitle.has(key)) return { ...row, color: byTitle.get(key) }

    const cls = matchClass(row.title, classes)
    const color = cls?.color
      ?? row.color
      ?? FALLBACK[nextFallback++ % FALLBACK.length]

    byTitle.set(key, color)
    return { ...row, color, classId: cls?.id ?? null }
  })
}
