export const ALL_VALUE = 'all'

export function resolveMultiSelection(previous, next) {
  const prevList = Array.isArray(previous) ? previous : [previous]
  const nextList = (Array.isArray(next) ? next : [next]).filter(v => v != null)

  const hadAll = prevList.includes(ALL_VALUE)
  const hasAll = nextList.includes(ALL_VALUE)

  if (hasAll && !hadAll) return [ALL_VALUE]
  const withoutAll = nextList.filter(v => v !== ALL_VALUE)
  if (!withoutAll.length) return [ALL_VALUE]
  return withoutAll
}
