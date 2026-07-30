import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  readLocalWraps, enableLocalEncryption, unlockLocal, changeLocalPassphrase,
  regenerateLocalRecoveryCode, updateLocalHint, rotateLocalKey, disableLocalEncryption,
} from './localEnable.js'
import { closeDekStore, getCachedDek } from './keyStore.js'
import { getEncMode, MODE_LOCAL, MODE_OFF } from './keyState.js'
import { getHint, SLOT_PASSPHRASE, SLOT_RECOVERY_CODE } from './wraps.js'

const PASSPHRASE = 'purple-tractor-91'

function createStorage() {
  const map = new Map()
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    clear: () => map.clear(),
    key: i => [...map.keys()][i] ?? null,
    get length() { return map.size },
  }
}

let resaveCalls

function resave() {
  resaveCalls += 1
  return Promise.resolve()
}

beforeEach(async () => {
  resaveCalls = 0
  vi.stubGlobal('localStorage', createStorage())
  await closeDekStore()
  await new Promise(resolve => {
    const request = indexedDB.deleteDatabase('organizer-keys')
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
})

const enable = (over = {}) => enableLocalEncryption({ passphrase: PASSPHRASE, resave, ...over })

describe('enabling local encryption', () => {
  it('stores wraps in local storage', async () => {
    await enable()
    expect(readLocalWraps()).toBeTruthy()
  })

  it('sets local mode', async () => {
    await enable()
    expect(getEncMode()).toBe(MODE_LOCAL)
  })

  it('caches a usable key', async () => {
    await enable()
    expect(getCachedDek()).toBeTruthy()
  })

  it('rewrites the stored state once', async () => {
    await enable()
    expect(resaveCalls).toBe(1)
  })

  it('returns a twelve word recovery code', async () => {
    const { recoveryCode } = await enable()
    expect(recoveryCode.split(' ')).toHaveLength(12)
  })

  it('stores an optional hint', async () => {
    await enable({ hint: 'the usual one' })
    expect(getHint(readLocalWraps())).toBe('the usual one')
  })

  it('never stores the passphrase', async () => {
    await enable()
    expect(JSON.stringify(readLocalWraps())).not.toContain(PASSPHRASE)
  })

  it('rolls back the wraps when the rewrite fails', async () => {
    const failing = () => Promise.reject(new Error('disk full'))
    await expect(enableLocalEncryption({ passphrase: PASSPHRASE, resave: failing }))
      .rejects.toThrow('disk full')
    expect(readLocalWraps()).toBe(null)
  })
})

describe('unlocking locally', () => {
  it('unlocks with the passphrase', async () => {
    const enabled = await enable()
    await closeDekStore()
    expect((await unlockLocal({ slot: SLOT_PASSPHRASE, secret: PASSPHRASE })).dekId)
      .toBe(enabled.dekId)
  })

  it('unlocks with the recovery code', async () => {
    const enabled = await enable()
    await closeDekStore()
    expect((await unlockLocal({ slot: SLOT_RECOVERY_CODE, secret: enabled.recoveryCode })).dekId)
      .toBe(enabled.dekId)
  })

  it('refuses a wrong passphrase', async () => {
    await enable()
    await closeDekStore()
    await expect(unlockLocal({ slot: SLOT_PASSPHRASE, secret: 'nope' }))
      .rejects.toThrow('wrap-unlock-failed')
  })

  it('refuses when no wraps exist', async () => {
    await expect(unlockLocal({ slot: SLOT_PASSPHRASE, secret: PASSPHRASE }))
      .rejects.toThrow('wrap-slot-missing')
  })
})

describe('managing local secrets', () => {
  it('changes the passphrase and keeps the key', async () => {
    const enabled = await enable()
    await changeLocalPassphrase({
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE, passphrase: 'new-secret-here',
    })
    await closeDekStore()
    expect((await unlockLocal({ slot: SLOT_PASSPHRASE, secret: 'new-secret-here' })).dekId)
      .toBe(enabled.dekId)
  })

  it('invalidates the old passphrase', async () => {
    await enable()
    await changeLocalPassphrase({
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE, passphrase: 'new-secret-here',
    })
    await closeDekStore()
    await expect(unlockLocal({ slot: SLOT_PASSPHRASE, secret: PASSPHRASE }))
      .rejects.toThrow('wrap-unlock-failed')
  })

  it('regenerates the recovery code and keeps the key', async () => {
    const enabled = await enable()
    const { recoveryCode } = await regenerateLocalRecoveryCode({
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
    })
    expect(recoveryCode).not.toBe(enabled.recoveryCode)
    await closeDekStore()
    expect((await unlockLocal({ slot: SLOT_RECOVERY_CODE, secret: recoveryCode })).dekId)
      .toBe(enabled.dekId)
  })

  it('updates the hint without touching the key', async () => {
    const enabled = await enable({ hint: 'first' })
    updateLocalHint('second')
    expect(getHint(readLocalWraps())).toBe('second')
    await closeDekStore()
    expect((await unlockLocal({ slot: SLOT_PASSPHRASE, secret: PASSPHRASE })).dekId)
      .toBe(enabled.dekId)
  })
})

describe('rotating the local key', () => {
  it('produces a new key identity', async () => {
    const enabled = await enable()
    const rotated = await rotateLocalKey({
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: 'rotated-secret', resave,
    })
    expect(rotated.dekId).not.toBe(enabled.dekId)
  })

  it('rewrites the stored state under the new key', async () => {
    await enable()
    resaveCalls = 0
    await rotateLocalKey({
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: 'rotated-secret', resave,
    })
    expect(resaveCalls).toBe(1)
  })

  it('invalidates the old passphrase and recovery code', async () => {
    const enabled = await enable()
    await rotateLocalKey({
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: 'rotated-secret', resave,
    })
    await closeDekStore()
    await expect(unlockLocal({ slot: SLOT_PASSPHRASE, secret: PASSPHRASE }))
      .rejects.toThrow('wrap-unlock-failed')
    await expect(unlockLocal({ slot: SLOT_RECOVERY_CODE, secret: enabled.recoveryCode }))
      .rejects.toThrow('wrap-unlock-failed')
  })

  it('refuses a wrong current passphrase and changes nothing', async () => {
    await enable()
    const before = JSON.stringify(readLocalWraps())
    await expect(rotateLocalKey({
      currentSlot: SLOT_PASSPHRASE, currentSecret: 'wrong',
      passphrase: 'rotated-secret', resave,
    })).rejects.toThrow('wrap-unlock-failed')
    expect(JSON.stringify(readLocalWraps())).toBe(before)
  })

  it('restores the old wraps when the rewrite fails', async () => {
    await enable()
    const before = JSON.stringify(readLocalWraps())
    await expect(rotateLocalKey({
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: 'rotated-secret', resave: () => Promise.reject(new Error('disk full')),
    })).rejects.toThrow('disk full')
    expect(JSON.stringify(readLocalWraps())).toBe(before)
  })

  it('carries the hint across', async () => {
    await enable({ hint: 'keep me' })
    await rotateLocalKey({
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: 'rotated-secret', resave,
    })
    expect(getHint(readLocalWraps())).toBe('keep me')
  })
})

describe('disabling local encryption', () => {
  it('clears the wraps and the mode', async () => {
    await enable()
    await disableLocalEncryption({ resave })
    expect(readLocalWraps()).toBe(null)
    expect(getEncMode()).toBe(MODE_OFF)
  })

  it('drops the cached key', async () => {
    await enable()
    await disableLocalEncryption({ resave })
    expect(getCachedDek()).toBe(null)
  })

  it('rewrites the state as plaintext', async () => {
    await enable()
    resaveCalls = 0
    await disableLocalEncryption({ resave })
    expect(resaveCalls).toBe(1)
  })
})
