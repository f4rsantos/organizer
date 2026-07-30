import { describe, it, expect } from 'vitest'
import {
  createWraps, unwrapDek, unwrapDekRaw, rewrapSlot, availableSlots, hasAnySlot,
  setHint, getHint, SLOT_PASSPHRASE, SLOT_RECOVERY_CODE,
} from './wraps.js'
import { encryptWithKey, decryptWithKey } from './envelope.js'
import { aadForLocalSlice } from './aad.js'
import { bytesToHex } from './bytes.js'

const FAST = { alg: 'argon2id', memoryKiB: 1024, iterations: 1, parallelism: 1 }
const PASSPHRASE = 'purple-tractor-91'
const AAD = aadForLocalSlice('tasks')

function build(overrides = {}) {
  return createWraps({ passphrase: PASSPHRASE, params: FAST, ...overrides })
}

describe('creation', () => {
  it('creates both slots', async () => {
    const { wraps } = await build()
    expect(availableSlots(wraps)).toEqual([SLOT_PASSPHRASE, SLOT_RECOVERY_CODE])
  })

  it('returns a twelve word recovery code', async () => {
    const { recoveryCode } = await build()
    expect(recoveryCode.split(' ')).toHaveLength(12)
  })

  it('returns a usable non-extractable key', async () => {
    const { dek } = await build()
    expect(dek.extractable).toBe(false)
    expect(await decryptWithKey(dek, await encryptWithKey(dek, 'x', AAD), AAD)).toBe('x')
  })

  it('returns a dek identity', async () => {
    const { dekId } = await build()
    expect(dekId).toMatch(/^[0-9a-f]{16}$/)
  })

  it('stores independent salts per slot', async () => {
    const { wraps } = await build()
    expect(wraps[SLOT_PASSPHRASE].salt).not.toBe(wraps[SLOT_RECOVERY_CODE].salt)
  })

  it('stores independent ivs per slot', async () => {
    const { wraps } = await build()
    expect(wraps[SLOT_PASSPHRASE].iv).not.toBe(wraps[SLOT_RECOVERY_CODE].iv)
  })

  it('records the kdf params per slot', async () => {
    const { wraps } = await build()
    expect(wraps[SLOT_PASSPHRASE].kdf).toEqual(FAST)
  })

  it('never stores the passphrase', async () => {
    const { wraps } = await build()
    expect(JSON.stringify(wraps)).not.toContain(PASSPHRASE)
  })

  it('never stores the recovery code', async () => {
    const { wraps, recoveryCode } = await build()
    expect(JSON.stringify(wraps)).not.toContain(recoveryCode.split(' ')[0] + ' ')
  })

  it('produces a different dek each time', async () => {
    const [a, b] = [await build(), await build()]
    expect(a.dekId).not.toBe(b.dekId)
  })
})

describe('unlocking', () => {
  it('unlocks with the passphrase', async () => {
    const { wraps, dekId } = await build()
    expect((await unwrapDek(wraps, SLOT_PASSPHRASE, PASSPHRASE)).dekId).toBe(dekId)
  })

  it('unlocks with the recovery code', async () => {
    const { wraps, recoveryCode, dekId } = await build()
    expect((await unwrapDek(wraps, SLOT_RECOVERY_CODE, recoveryCode)).dekId).toBe(dekId)
  })

  it('yields the same key from either slot', async () => {
    const { wraps, recoveryCode } = await build()
    const viaPass = await unwrapDek(wraps, SLOT_PASSPHRASE, PASSPHRASE)
    const viaCode = await unwrapDek(wraps, SLOT_RECOVERY_CODE, recoveryCode)
    expect(viaPass.dekId).toBe(viaCode.dekId)
  })

  it('yields a key that reads data written by the original', async () => {
    const { wraps, dek } = await build()
    const envelope = await encryptWithKey(dek, { secret: true }, AAD)
    const { dek: unlocked } = await unwrapDek(wraps, SLOT_PASSPHRASE, PASSPHRASE)
    expect(await decryptWithKey(unlocked, envelope, AAD)).toEqual({ secret: true })
  })

  it('yields a non-extractable key', async () => {
    const { wraps } = await build()
    const { dek } = await unwrapDek(wraps, SLOT_PASSPHRASE, PASSPHRASE)
    expect(dek.extractable).toBe(false)
  })

  it('accepts a recovery code in mixed case with loose spacing', async () => {
    const { wraps, recoveryCode, dekId } = await build()
    const messy = `  ${recoveryCode.toUpperCase().split(' ').join('   ')}  `
    expect((await unwrapDek(wraps, SLOT_RECOVERY_CODE, messy)).dekId).toBe(dekId)
  })
})

describe('failed unlocking', () => {
  it('rejects a wrong passphrase', async () => {
    const { wraps } = await build()
    await expect(unwrapDek(wraps, SLOT_PASSPHRASE, 'wrong')).rejects.toThrow('wrap-unlock-failed')
  })

  it('rejects a wrong recovery code', async () => {
    const { wraps } = await build()
    const other = (await build()).recoveryCode
    await expect(unwrapDek(wraps, SLOT_RECOVERY_CODE, other)).rejects.toThrow('wrap-unlock-failed')
  })

  it('rejects a malformed recovery code', async () => {
    const { wraps } = await build()
    await expect(unwrapDek(wraps, SLOT_RECOVERY_CODE, 'not a phrase'))
      .rejects.toThrow('wrap-unlock-failed')
  })

  it('reports the same error for a wrong passphrase and a wrong code', async () => {
    const { wraps } = await build()
    const passErr = await unwrapDek(wraps, SLOT_PASSPHRASE, 'wrong').catch(e => e.message)
    const codeErr = await unwrapDek(wraps, SLOT_RECOVERY_CODE, 'not a phrase').catch(e => e.message)
    expect(passErr).toBe(codeErr)
  })

  it('rejects a missing slot', async () => {
    const { wraps } = await build()
    const stripped = { ...wraps }
    delete stripped[SLOT_RECOVERY_CODE]
    await expect(unwrapDek(stripped, SLOT_RECOVERY_CODE, 'x')).rejects.toThrow('wrap-slot-missing')
  })

  it('rejects a passphrase blob pasted into the recovery slot', async () => {
    const { wraps, recoveryCode } = await build()
    const swapped = { ...wraps, [SLOT_RECOVERY_CODE]: wraps[SLOT_PASSPHRASE] }
    await expect(unwrapDek(swapped, SLOT_RECOVERY_CODE, recoveryCode))
      .rejects.toThrow('wrap-unlock-failed')
  })

  it('rejects a recovery blob pasted into the passphrase slot', async () => {
    const { wraps } = await build()
    const swapped = { ...wraps, [SLOT_PASSPHRASE]: wraps[SLOT_RECOVERY_CODE] }
    await expect(unwrapDek(swapped, SLOT_PASSPHRASE, PASSPHRASE))
      .rejects.toThrow('wrap-unlock-failed')
  })

  it('rejects a tampered wrapped blob', async () => {
    const { wraps } = await build()
    const bytes = atob(wraps[SLOT_PASSPHRASE].wrapped).split('')
    bytes[0] = String.fromCharCode(bytes[0].charCodeAt(0) ^ 0xff)
    const tampered = {
      ...wraps,
      [SLOT_PASSPHRASE]: { ...wraps[SLOT_PASSPHRASE], wrapped: btoa(bytes.join('')) },
    }
    await expect(unwrapDek(tampered, SLOT_PASSPHRASE, PASSPHRASE))
      .rejects.toThrow('wrap-unlock-failed')
  })

  it('rejects a swapped salt', async () => {
    const { wraps } = await build()
    const tampered = {
      ...wraps,
      [SLOT_PASSPHRASE]: {
        ...wraps[SLOT_PASSPHRASE],
        salt: wraps[SLOT_RECOVERY_CODE].salt,
      },
    }
    await expect(unwrapDek(tampered, SLOT_PASSPHRASE, PASSPHRASE))
      .rejects.toThrow('wrap-unlock-failed')
  })
})

describe('rewrapping a slot', () => {
  it('changes the passphrase without changing the key', async () => {
    const { wraps, dekId } = await build()
    const raw = await unwrapDekRaw(wraps, SLOT_PASSPHRASE, PASSPHRASE)
    const { wraps: next } = await rewrapSlot({
      wraps, raw, slot: SLOT_PASSPHRASE, secret: 'new-secret', params: FAST,
    })
    expect((await unwrapDek(next, SLOT_PASSPHRASE, 'new-secret')).dekId).toBe(dekId)
  })

  it('invalidates the old passphrase', async () => {
    const { wraps } = await build()
    const raw = await unwrapDekRaw(wraps, SLOT_PASSPHRASE, PASSPHRASE)
    const { wraps: next } = await rewrapSlot({
      wraps, raw, slot: SLOT_PASSPHRASE, secret: 'new-secret', params: FAST,
    })
    await expect(unwrapDek(next, SLOT_PASSPHRASE, PASSPHRASE)).rejects.toThrow('wrap-unlock-failed')
  })

  it('leaves the recovery code working', async () => {
    const { wraps, recoveryCode, dekId } = await build()
    const raw = await unwrapDekRaw(wraps, SLOT_PASSPHRASE, PASSPHRASE)
    const { wraps: next } = await rewrapSlot({
      wraps, raw, slot: SLOT_PASSPHRASE, secret: 'new-secret', params: FAST,
    })
    expect((await unwrapDek(next, SLOT_RECOVERY_CODE, recoveryCode)).dekId).toBe(dekId)
  })

  it('regenerates the recovery code and keeps the key', async () => {
    const { wraps, recoveryCode, dekId } = await build()
    const raw = await unwrapDekRaw(wraps, SLOT_PASSPHRASE, PASSPHRASE)
    const { wraps: next, recoveryCode: fresh } = await rewrapSlot({
      wraps, raw, slot: SLOT_RECOVERY_CODE, params: FAST,
    })
    expect(fresh).not.toBe(recoveryCode)
    expect((await unwrapDek(next, SLOT_RECOVERY_CODE, fresh)).dekId).toBe(dekId)
  })

  it('invalidates the old recovery code', async () => {
    const { wraps, recoveryCode } = await build()
    const raw = await unwrapDekRaw(wraps, SLOT_PASSPHRASE, PASSPHRASE)
    const { wraps: next } = await rewrapSlot({
      wraps, raw, slot: SLOT_RECOVERY_CODE, params: FAST,
    })
    await expect(unwrapDek(next, SLOT_RECOVERY_CODE, recoveryCode))
      .rejects.toThrow('wrap-unlock-failed')
  })

  it('rejects an unknown slot', async () => {
    const { wraps } = await build()
    const raw = await unwrapDekRaw(wraps, SLOT_PASSPHRASE, PASSPHRASE)
    await expect(rewrapSlot({ wraps, raw, slot: 'question', secret: 'x' }))
      .rejects.toThrow('wrap-slot-unknown')
  })

  it('does not mutate the original wraps', async () => {
    const { wraps } = await build()
    const before = JSON.stringify(wraps)
    const raw = await unwrapDekRaw(wraps, SLOT_PASSPHRASE, PASSPHRASE)
    await rewrapSlot({ wraps, raw, slot: SLOT_PASSPHRASE, secret: 'new', params: FAST })
    expect(JSON.stringify(wraps)).toBe(before)
  })
})

describe('raw unwrapping', () => {
  it('returns 32 bytes', async () => {
    const { wraps } = await build()
    expect((await unwrapDekRaw(wraps, SLOT_PASSPHRASE, PASSPHRASE)).length).toBe(32)
  })

  it('returns the same bytes from either slot', async () => {
    const { wraps, recoveryCode } = await build()
    const viaPass = await unwrapDekRaw(wraps, SLOT_PASSPHRASE, PASSPHRASE)
    const viaCode = await unwrapDekRaw(wraps, SLOT_RECOVERY_CODE, recoveryCode)
    expect(bytesToHex(viaPass)).toBe(bytesToHex(viaCode))
  })
})

describe('slot inspection', () => {
  it('reports no slots for an empty record', () => {
    expect(hasAnySlot({})).toBe(false)
    expect(hasAnySlot(null)).toBe(false)
  })

  it('reports slots for a real record', async () => {
    const { wraps } = await build()
    expect(hasAnySlot(wraps)).toBe(true)
  })

  it('ignores a malformed slot', async () => {
    const { wraps } = await build()
    expect(availableSlots({ ...wraps, [SLOT_PASSPHRASE]: { salt: 'x' } }))
      .toEqual([SLOT_RECOVERY_CODE])
  })
})

describe('hint', () => {
  it('stores a hint when given', async () => {
    const { wraps } = await build({ hint: 'the usual one' })
    expect(getHint(wraps)).toBe('the usual one')
  })

  it('stores no hint by default', async () => {
    const { wraps } = await build()
    expect(getHint(wraps)).toBe(null)
  })

  it('sets a hint after the fact', async () => {
    const { wraps } = await build()
    expect(getHint(setHint(wraps, 'later'))).toBe('later')
  })

  it('clears a hint', async () => {
    const { wraps } = await build({ hint: 'gone soon' })
    expect(getHint(setHint(wraps, ''))).toBe(null)
  })

  it('keeps the hint out of the unlock path', async () => {
    const { wraps, dekId } = await build({ hint: 'first pet' })
    expect((await unwrapDek(wraps, SLOT_PASSPHRASE, PASSPHRASE)).dekId).toBe(dekId)
    await expect(unwrapDek(wraps, SLOT_PASSPHRASE, 'first pet'))
      .rejects.toThrow('wrap-unlock-failed')
  })
})
