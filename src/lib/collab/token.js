import { bytesToHex, randomBytes, constantTimeEqualHex } from '../crypto'

const TOKEN_BYTES = 16
const SALT_BYTES = 16

export function createInviteToken() {
  return bytesToHex(randomBytes(TOKEN_BYTES))
}

export function createTokenSalt() {
  return bytesToHex(randomBytes(SALT_BYTES))
}

export async function hashToken(token, salt = '') {
  const data = new TextEncoder().encode(`${salt}:${token}`)
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', data)))
}

export async function matchesTokenHash({ token, salt, tokenHash }) {
  if (!token || !tokenHash) return false
  return constantTimeEqualHex(await hashToken(token, salt ?? ''), tokenHash)
}
