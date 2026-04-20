const COLLAP_ID_KEY = 'organizer:collab:userId'

function createId() {
  const time = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 10)
  return `u_${time}_${rand}`
}

export function getOrCreateCollabUserId() {
  try {
    const existing = localStorage.getItem(COLLAP_ID_KEY)
    if (existing) return existing
    const id = createId()
    localStorage.setItem(COLLAP_ID_KEY, id)
    return id
  } catch {
    return createId()
  }
}
