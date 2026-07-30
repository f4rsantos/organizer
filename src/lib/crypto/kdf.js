const ALGO = 'AES-GCM'
const KEY_BYTES = 32

export const ALG_ARGON2ID = 'argon2id'

export const KDF_DEFAULT = Object.freeze({
  alg: ALG_ARGON2ID,
  memoryKiB: 19456,
  iterations: 2,
  parallelism: 1,
})

export const SALT_BYTES = 16

function positiveInt(value, fallback) {
  const parsed = Number(value ?? fallback)
  if (!Number.isFinite(parsed) || parsed < 1) throw new Error('kdf-params-invalid')
  return parsed
}

export async function deriveWrappingKey(secret, salt, params = KDF_DEFAULT) {
  if ((params?.alg ?? KDF_DEFAULT.alg) !== ALG_ARGON2ID) throw new Error('kdf-alg-unsupported')

  const password = String(secret ?? '').normalize('NFKD')
  if (!password) throw new Error('kdf-secret-required')

  const { argon2id } = await import('hash-wasm')
  const raw = await argon2id({
    password,
    salt,
    memorySize: positiveInt(params?.memoryKiB, KDF_DEFAULT.memoryKiB),
    iterations: positiveInt(params?.iterations, KDF_DEFAULT.iterations),
    parallelism: positiveInt(params?.parallelism, KDF_DEFAULT.parallelism),
    hashLength: KEY_BYTES,
    outputType: 'binary',
  })

  return crypto.subtle.importKey('raw', raw, ALGO, false, ['encrypt', 'decrypt'])
}
