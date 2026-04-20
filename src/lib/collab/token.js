function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function createInviteToken() {
  const raw = crypto.getRandomValues(new Uint8Array(8))
  return bytesToHex(raw)
}

export async function hashToken(token) {
  const data = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(digest))
}
