const byProvider = new Map()
const listeners = new Set()

export function setProviderEvents(providerId, events) {
  const next = Array.isArray(events) ? events : []
  const current = byProvider.get(providerId)
  if (current && current.length === next.length && current.every((e, i) => e === next[i])) return

  byProvider.set(providerId, next)
  for (const listener of listeners) listener()
}

export function getProviderEvents() {
  return [...byProvider.values()].flat()
}

export function subscribeProviderEvents(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
