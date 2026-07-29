import { toBase64, fromBase64, randomBytes } from './bytes'

const ALGO = 'AES-GCM'
const KEY_BYTES = 32

const keyCache = new Map()

export function generateRawKeyString() {
  return toBase64(randomBytes(KEY_BYTES))
}

export function validateKeyString(keyString) {
  if (typeof keyString !== 'string' || !keyString.trim()) return false
  try {
    return fromBase64(keyString.trim()).length === KEY_BYTES
  } catch {
    return false
  }
}

export async function importRawKey(keyString) {
  const trimmed = String(keyString ?? '').trim()
  if (!validateKeyString(trimmed)) throw new Error('invalid-key')
  const cached = keyCache.get(trimmed)
  if (cached) return cached
  const key = await crypto.subtle.importKey(
    'raw', fromBase64(trimmed), ALGO, false, ['encrypt', 'decrypt'],
  )
  keyCache.set(trimmed, key)
  return key
}

export function clearRawKeyCache() {
  keyCache.clear()
}
