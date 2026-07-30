import { describe, it, expect } from 'vitest'
import { deriveWrappingKey, KDF_DEFAULT, SALT_BYTES } from './kdf.js'
import { randomBytes } from './bytes.js'
import { encryptWithKey, decryptWithKey } from './envelope.js'
import { aadForWrap } from './aad.js'

const FAST = { alg: 'argon2id', memoryKiB: 1024, iterations: 1, parallelism: 1 }
const SALT = randomBytes(SALT_BYTES)
const AAD = aadForWrap('passphrase')

describe('determinism', () => {
  it('derives a usable key that round trips a value', async () => {
    const key = await deriveWrappingKey('correct horse', SALT, FAST)
    expect(await decryptWithKey(key, await encryptWithKey(key, 'x', AAD), AAD)).toBe('x')
  })

  it('derives the same key for the same secret, salt and params', async () => {
    const a = await deriveWrappingKey('correct horse', SALT, FAST)
    const b = await deriveWrappingKey('correct horse', SALT, FAST)
    const envelope = await encryptWithKey(a, 'shared', AAD)
    expect(await decryptWithKey(b, envelope, AAD)).toBe('shared')
  })

  it('derives a different key for a different salt', async () => {
    const a = await deriveWrappingKey('correct horse', SALT, FAST)
    const b = await deriveWrappingKey('correct horse', randomBytes(SALT_BYTES), FAST)
    await expect(decryptWithKey(b, await encryptWithKey(a, 'x', AAD), AAD)).rejects.toThrow()
  })

  it('derives a different key for a different secret', async () => {
    const a = await deriveWrappingKey('correct horse', SALT, FAST)
    const b = await deriveWrappingKey('wrong horse', SALT, FAST)
    await expect(decryptWithKey(b, await encryptWithKey(a, 'x', AAD), AAD)).rejects.toThrow()
  })

  it('derives a different key for a different iteration count', async () => {
    const a = await deriveWrappingKey('correct horse', SALT, FAST)
    const b = await deriveWrappingKey('correct horse', SALT, { ...FAST, iterations: 2000 })
    await expect(decryptWithKey(b, await encryptWithKey(a, 'x', AAD), AAD)).rejects.toThrow()
  })

  it('normalizes the secret so equivalent unicode forms match', async () => {
    const a = await deriveWrappingKey('café', SALT, FAST)
    const b = await deriveWrappingKey('café', SALT, FAST)
    expect(await decryptWithKey(b, await encryptWithKey(a, 'x', AAD), AAD)).toBe('x')
  })
})

describe('params validation', () => {
  it('defaults to a memory-hard algorithm', () => {
    expect(KDF_DEFAULT.alg).toBe('argon2id')
    expect(KDF_DEFAULT.memoryKiB).toBeGreaterThanOrEqual(19456)
  })

  it('rejects an unknown algorithm', async () => {
    await expect(deriveWrappingKey('x', SALT, { alg: 'scrypt', iterations: 1 }))
      .rejects.toThrow('kdf-alg-unsupported')
  })

  it('rejects a legacy pbkdf2 wrap', async () => {
    await expect(deriveWrappingKey('x', SALT, { alg: 'PBKDF2-SHA256', iterations: 600000 }))
      .rejects.toThrow('kdf-alg-unsupported')
  })

  it('rejects a zero memory size', async () => {
    await expect(deriveWrappingKey('x', SALT, { ...FAST, memoryKiB: 0 }))
      .rejects.toThrow('kdf-params-invalid')
  })

  it('rejects a non-numeric iteration count', async () => {
    await expect(deriveWrappingKey('x', SALT, { ...FAST, iterations: 'lots' }))
      .rejects.toThrow('kdf-params-invalid')
  })

  it('rejects a zero iteration count', async () => {
    await expect(deriveWrappingKey('x', SALT, { ...FAST, iterations: 0 }))
      .rejects.toThrow('kdf-params-invalid')
  })

  it('rejects a zero parallelism', async () => {
    await expect(deriveWrappingKey('x', SALT, { ...FAST, parallelism: 0 }))
      .rejects.toThrow('kdf-params-invalid')
  })

  it('rejects an empty secret', async () => {
    await expect(deriveWrappingKey('', SALT, FAST)).rejects.toThrow('kdf-secret-required')
  })

  it('rejects a missing secret', async () => {
    await expect(deriveWrappingKey(null, SALT, FAST)).rejects.toThrow('kdf-secret-required')
  })
})
