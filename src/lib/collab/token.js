import { bytesToHex, randomBytes } from '../crypto'

export function createInviteToken() {
  return bytesToHex(randomBytes(8))
}

export async function hashToken(token) {
  const data = new TextEncoder().encode(token)
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', data)))
}
