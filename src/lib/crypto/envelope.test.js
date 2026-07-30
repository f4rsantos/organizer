import { describe, it, expect } from 'vitest'
import { encryptWithKey, decryptWithKey, isEnvelope, isSupportedEnvelope } from './envelope.js'
import { importRawKey, generateRawKeyString, validateKeyString } from './rawKey.js'
import { aadForLocalSlice, aadForPersonalSlice, aadForTeamSlice } from './aad.js'

const KEY_STRING = 'A'.repeat(43) + '='
const OTHER_KEY_STRING = 'B'.repeat(43) + '='
const STATE = { tasks: [{ id: 't1', title: 'secret plan' }], settings: { workMode: true } }
const AAD = aadForLocalSlice('tasks')

const key = await importRawKey(KEY_STRING)
const otherKey = await importRawKey(OTHER_KEY_STRING)

describe('round trip', () => {
  it('restores the original state', async () => {
    expect(await decryptWithKey(key, await encryptWithKey(key, STATE, AAD), AAD)).toEqual(STATE)
  })

  it('produces an envelope, not readable state', async () => {
    expect(JSON.stringify(await encryptWithKey(key, STATE, AAD))).not.toContain('secret plan')
  })

  it('stamps the envelope version', async () => {
    expect((await encryptWithKey(key, STATE, AAD)).version).toBe(1)
  })

  it('handles an empty state', async () => {
    expect(await decryptWithKey(key, await encryptWithKey(key, {}, AAD), AAD)).toEqual({})
  })
})

describe('IV uniqueness', () => {
  it('uses a different IV for each encryption', async () => {
    const [a, b] = await Promise.all([
      encryptWithKey(key, STATE, AAD), encryptWithKey(key, STATE, AAD),
    ])
    expect(a.iv).not.toBe(b.iv)
  })

  it('produces different ciphertext for identical input', async () => {
    const [a, b] = await Promise.all([
      encryptWithKey(key, STATE, AAD), encryptWithKey(key, STATE, AAD),
    ])
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })

  it('keeps every IV distinct across many encryptions', async () => {
    const envelopes = await Promise.all(
      Array.from({ length: 100 }, () => encryptWithKey(key, STATE, AAD)),
    )
    expect(new Set(envelopes.map(e => e.iv)).size).toBe(100)
  })
})

describe('authentication', () => {
  it('rejects a tampered ciphertext', async () => {
    const envelope = await encryptWithKey(key, STATE, AAD)
    const bytes = atob(envelope.ciphertext).split('')
    bytes[0] = String.fromCharCode(bytes[0].charCodeAt(0) ^ 0xff)
    const tampered = { ...envelope, ciphertext: btoa(bytes.join('')) }
    await expect(decryptWithKey(key, tampered, AAD)).rejects.toThrow()
  })

  it('rejects a tampered IV', async () => {
    const envelope = await encryptWithKey(key, STATE, AAD)
    const bytes = atob(envelope.iv).split('')
    bytes[0] = String.fromCharCode(bytes[0].charCodeAt(0) ^ 0xff)
    const tampered = { ...envelope, iv: btoa(bytes.join('')) }
    await expect(decryptWithKey(key, tampered, AAD)).rejects.toThrow()
  })

  it('rejects the wrong key', async () => {
    const envelope = await encryptWithKey(key, STATE, AAD)
    await expect(decryptWithKey(otherKey, envelope, AAD)).rejects.toThrow()
  })
})

describe('slot binding', () => {
  it('refuses an envelope replayed into another slice', async () => {
    const envelope = await encryptWithKey(key, STATE, aadForLocalSlice('tasks'))
    await expect(decryptWithKey(key, envelope, aadForLocalSlice('notes'))).rejects.toThrow()
  })

  it('refuses a local envelope replayed into the personal doc', async () => {
    const envelope = await encryptWithKey(key, STATE, aadForLocalSlice('tasks'))
    await expect(decryptWithKey(key, envelope, aadForPersonalSlice('tasks'))).rejects.toThrow()
  })

  it('refuses an envelope replayed into another team', async () => {
    const envelope = await encryptWithKey(key, STATE, aadForTeamSlice('teamA', 'tasks'))
    await expect(decryptWithKey(key, envelope, aadForTeamSlice('teamB', 'tasks'))).rejects.toThrow()
  })

  it('requires an aad on encrypt', async () => {
    await expect(encryptWithKey(key, STATE, undefined)).rejects.toThrow('aad-required')
  })

  it('requires an aad on decrypt', async () => {
    const envelope = await encryptWithKey(key, STATE, AAD)
    await expect(decryptWithKey(key, envelope, undefined)).rejects.toThrow('aad-required')
  })

  it('rejects an empty aad', async () => {
    await expect(encryptWithKey(key, STATE, '')).rejects.toThrow('aad-required')
  })
})

describe('envelope detection', () => {
  it('recognises a real envelope', async () => {
    expect(isEnvelope(await encryptWithKey(key, STATE, AAD))).toBe(true)
  })

  it('does not mistake plain state for an envelope', () => {
    expect(isEnvelope(STATE)).toBe(false)
  })

  it('rejects null', () => {
    expect(isEnvelope(null)).toBe(false)
  })

  it('accepts a version 1 envelope', () => {
    expect(isSupportedEnvelope({ version: 1, iv: 'a', ciphertext: 'b' })).toBe(true)
  })

  it('assumes version 1 when the field is absent', () => {
    expect(isSupportedEnvelope({ iv: 'a', ciphertext: 'b' })).toBe(true)
  })

  it('refuses a future envelope version', () => {
    expect(isSupportedEnvelope({ version: 2, iv: 'a', ciphertext: 'b' })).toBe(false)
  })

  it('throws rather than decrypting an unsupported version', async () => {
    const envelope = { ...(await encryptWithKey(key, STATE, AAD)), version: 2 }
    await expect(decryptWithKey(key, envelope, AAD)).rejects.toThrow('encryption-version-unsupported')
  })
})

describe('key validation', () => {
  it('accepts a correctly sized key', () => {
    expect(validateKeyString(KEY_STRING)).toBe(true)
  })

  it('accepts a generated key', () => {
    expect(validateKeyString(generateRawKeyString())).toBe(true)
  })

  it('generates a different key each time', () => {
    expect(generateRawKeyString()).not.toBe(generateRawKeyString())
  })

  it('rejects an empty key', () => {
    expect(validateKeyString('')).toBe(false)
  })

  it('rejects a short key', () => {
    expect(validateKeyString('abc')).toBe(false)
  })

  it('rejects a non-string key', () => {
    expect(validateKeyString(null)).toBe(false)
  })

  it('refuses to import a malformed key', async () => {
    await expect(importRawKey('nope')).rejects.toThrow('invalid-key')
  })

  it('returns a cached key for the same string', async () => {
    expect(await importRawKey(KEY_STRING)).toBe(await importRawKey(KEY_STRING))
  })
})
