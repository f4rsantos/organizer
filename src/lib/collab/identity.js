const COLLAP_ID_KEY = 'organizer:collab:userId'

function createId() {
  const time = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 10)
  return `u_${time}_${rand}`
}

export function readCachedCollabUserId() {
  try {
    return localStorage.getItem(COLLAP_ID_KEY) || null
  } catch {
    return null
  }
}

// The synced `collab.userId` is the real identity; this copy only survives a
// cleared store. Writing it back on every import keeps a device from reviving
// an id the team has already replaced.
export function cacheCollabUserId(id) {
  if (!id) return
  try {
    localStorage.setItem(COLLAP_ID_KEY, id)
  } catch {
    // private mode: the store copy still carries the identity
  }
}

export function getOrCreateCollabUserId() {
  const existing = readCachedCollabUserId()
  if (existing) return existing
  const id = createId()
  cacheCollabUserId(id)
  return id
}
