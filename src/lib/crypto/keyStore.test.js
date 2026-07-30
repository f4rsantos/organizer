import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  openDekStore, getDek, putDek, clearDek, importDekFromRaw, computeDekId,
  generateDekBytes, getCachedDek, setCachedDek, closeDekStore,
} from './keyStore.js'
import { encryptWithKey, decryptWithKey } from './envelope.js'
import { aadForLocalSlice } from './aad.js'

const AAD = aadForLocalSlice('tasks')

function deleteDb() {
  return new Promise(resolve => {
    const request = indexedDB.deleteDatabase('organizer-keys')
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}

beforeEach(async () => {
  await closeDekStore()
  await deleteDb()
})

async function storeFreshDek() {
  await putDek(await importDekFromRaw(generateDekBytes()))
}

async function reopen() {
  await closeDekStore()
  return getDek()
}

describe('store lifecycle', () => {
  it('opens without a stored key', async () => {
    await openDekStore()
    expect(await getDek()).toBe(null)
  })

  it('round trips a key', async () => {
    await storeFreshDek()
    expect(await reopen()).toBeTruthy()
  })

  it('clears the key', async () => {
    await storeFreshDek()
    await clearDek()
    expect(await reopen()).toBe(null)
  })

  it('overwrites an existing key', async () => {
    await storeFreshDek()
    const envelope = await encryptWithKey(await getDek(), 'first', AAD)
    await storeFreshDek()
    await expect(decryptWithKey(await reopen(), envelope, AAD)).rejects.toThrow()
  })
})

describe('the stored key cannot be exfiltrated', () => {
  it('survives the round trip as non-extractable', async () => {
    await storeFreshDek()
    expect((await reopen()).extractable).toBe(false)
  })

  it('refuses exportKey after the round trip', async () => {
    await storeFreshDek()
    await expect(crypto.subtle.exportKey('raw', await reopen())).rejects.toThrow()
  })

  it('is still usable for encryption and decryption', async () => {
    await storeFreshDek()
    const key = await reopen()
    expect(await decryptWithKey(key, await encryptWithKey(key, { a: 1 }, AAD), AAD)).toEqual({ a: 1 })
  })

  it('reads back the same key material', async () => {
    await storeFreshDek()
    const envelope = await encryptWithKey(await getDek(), 'payload', AAD)
    expect(await decryptWithKey(await reopen(), envelope, AAD)).toBe('payload')
  })
})

describe('module cache', () => {
  it('serves the cached key without reopening the database', async () => {
    await storeFreshDek()
    await getDek()
    const spy = vi.spyOn(indexedDB, 'open')
    await getDek()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('exposes the cached key synchronously once loaded', async () => {
    await storeFreshDek()
    expect(getCachedDek()).toBeTruthy()
  })

  it('reports no cached key after a reset', async () => {
    await storeFreshDek()
    await closeDekStore()
    expect(getCachedDek()).toBe(null)
  })

  it('accepts an externally supplied cached key', async () => {
    const key = await importDekFromRaw(generateDekBytes())
    await closeDekStore()
    setCachedDek(key)
    expect(await getDek()).toBe(key)
  })
})

describe('dek identity', () => {
  it('is stable for the same key material', async () => {
    const raw = generateDekBytes()
    expect(await computeDekId(raw)).toBe(await computeDekId(raw))
  })

  it('differs across key material', async () => {
    expect(await computeDekId(generateDekBytes()))
      .not.toBe(await computeDekId(generateDekBytes()))
  })

  it('is a short hex string', async () => {
    expect(await computeDekId(generateDekBytes())).toMatch(/^[0-9a-f]{16}$/)
  })
})

describe('key material', () => {
  it('generates 32 bytes', () => {
    expect(generateDekBytes().length).toBe(32)
  })

  it('imports as non-extractable', async () => {
    expect((await importDekFromRaw(generateDekBytes())).extractable).toBe(false)
  })
})
