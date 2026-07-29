const ALGO = 'AES-GCM'

export const KDF_DEFAULT = Object.freeze({ alg: 'PBKDF2-SHA256', iterations: 600000 })
export const SALT_BYTES = 16

export async function deriveWrappingKey(secret, salt, params = KDF_DEFAULT) {
  if ((params?.alg ?? KDF_DEFAULT.alg) !== 'PBKDF2-SHA256') throw new Error('kdf-alg-unsupported')

  const iterations = Number(params?.iterations)
  if (!Number.isFinite(iterations) || iterations < 1) throw new Error('kdf-params-invalid')

  const normalized = String(secret ?? '').normalize('NFKD')
  if (!normalized) throw new Error('kdf-secret-required')

  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(normalized), 'PBKDF2', false, ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}
