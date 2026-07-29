import { toBase64, fromBase64, randomBytes } from './bytes'

export const ENVELOPE_VERSION = 1
const ALGO = 'AES-GCM'
const IV_BYTES = 12

function encodeAad(aad) {
  if (typeof aad !== 'string' || !aad) throw new Error('aad-required')
  return new TextEncoder().encode(aad)
}

export async function encryptWithKey(cryptoKey, value, aad) {
  const additionalData = encodeAad(aad)
  const iv = randomBytes(IV_BYTES)
  const plaintext = new TextEncoder().encode(JSON.stringify(value))
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv, additionalData }, cryptoKey, plaintext,
  )
  return {
    version: ENVELOPE_VERSION,
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  }
}

export async function decryptWithKey(cryptoKey, envelope, aad) {
  if (!isSupportedEnvelope(envelope)) throw new Error('encryption-version-unsupported')
  const additionalData = encodeAad(aad)
  const plaintext = await crypto.subtle.decrypt(
    { name: ALGO, iv: fromBase64(envelope.iv), additionalData },
    cryptoKey,
    fromBase64(envelope.ciphertext),
  )
  return JSON.parse(new TextDecoder().decode(plaintext))
}

export function isEnvelope(data) {
  return Boolean(
    data
    && typeof data === 'object'
    && typeof data.iv === 'string'
    && typeof data.ciphertext === 'string',
  )
}

export function isSupportedEnvelope(data) {
  if (!isEnvelope(data)) return false
  return (data.version ?? ENVELOPE_VERSION) === ENVELOPE_VERSION
}
