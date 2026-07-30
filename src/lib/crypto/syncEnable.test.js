import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { enableSyncEncryption, updatePassphrase, replaceRecoveryCode, updateHint } from './syncEnable.js'
import { closeDekStore, getCachedDek } from './keyStore.js'
import { unwrapDek, hasAnySlot, getHint, SLOT_PASSPHRASE, SLOT_RECOVERY_CODE } from './wraps.js'
import { decodeSlices } from './sliceCodec.js'
import { aadForPersonalSlice } from './aad.js'

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

function fakeRemote() {
  const doc = { value: null }
  return {
    doc,
    pushContainer: async ({ state, dek, wraps, dekId }) => {
      doc.value = {
        ...await import('./sliceCodec.js').then(m => m.encodeSlices({
          state, key: dek, aadFor: aadForPersonalSlice, rev: 1,
        })),
        encMode: 'sync',
        wraps,
        dekId,
      }
    },
    pushWraps: async wraps => {
      if (!doc.value) throw new Error('sync-doc-missing')
      doc.value = { ...doc.value, wraps }
    },
  }
}

const state = () => ({
  version: 7, theme: 'system', lang: 'en', onboardingDone: true,
  tasks: [{ id: 't1', title: 'secret plan' }], notes: [], settings: {},
})

beforeEach(async () => {
  vi.stubGlobal('localStorage', createStorage())
  await closeDekStore()
  await new Promise(resolve => {
    const request = indexedDB.deleteDatabase('organizer-keys')
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
})

describe('enabling encryption for sync', () => {
  it('writes an encrypted container with wraps', async () => {
    const remote = fakeRemote()
    await enableSyncEncryption({ passphrase: PASSPHRASE, state: state(), ...remote })

    expect(remote.doc.value.encMode).toBe('sync')
    expect(hasAnySlot(remote.doc.value.wraps)).toBe(true)
    expect(JSON.stringify(remote.doc.value.slices)).not.toContain('secret plan')
  })

  it('returns a recovery code that unwraps the same key', async () => {
    const remote = fakeRemote()
    const result = await enableSyncEncryption({
      passphrase: PASSPHRASE, state: state(), ...remote,
    })

    const viaCode = await unwrapDek(result.wraps, SLOT_RECOVERY_CODE, result.recoveryCode)
    expect(viaCode.dekId).toBe(result.dekId)
  })

  it('unlocks with the passphrase from another device', async () => {
    const remote = fakeRemote()
    const result = await enableSyncEncryption({
      passphrase: PASSPHRASE, state: state(), ...remote,
    })

    const { dek } = await unwrapDek(remote.doc.value.wraps, SLOT_PASSPHRASE, PASSPHRASE)
    const decoded = await decodeSlices({
      container: remote.doc.value, key: dek, aadFor: aadForPersonalSlice,
    })
    expect(decoded.tasks[0].title).toBe('secret plan')
    expect(result.dekId).toBeTruthy()
  })

  it('caches the key locally only after the push succeeds', async () => {
    const remote = fakeRemote()
    const failing = {
      pushContainer: async () => { throw new Error('network') },
      pushWraps: remote.pushWraps,
    }

    await expect(enableSyncEncryption({ passphrase: PASSPHRASE, state: state(), ...failing }))
      .rejects.toThrow('network')
    expect(getCachedDek()).toBe(null)
  })

  it('stores the hint when given', async () => {
    const remote = fakeRemote()
    await enableSyncEncryption({
      passphrase: PASSPHRASE, hint: 'the usual one', state: state(), ...remote,
    })
    expect(getHint(remote.doc.value.wraps)).toBe('the usual one')
  })
})

describe('wraps survive later writes', () => {
  it('keeps wraps when only the hint changes', async () => {
    const remote = fakeRemote()
    const enabled = await enableSyncEncryption({
      passphrase: PASSPHRASE, state: state(), ...remote,
    })

    await updateHint({ wraps: remote.doc.value.wraps, hint: 'later', pushWraps: remote.pushWraps })

    const viaPass = await unwrapDek(remote.doc.value.wraps, SLOT_PASSPHRASE, PASSPHRASE)
    expect(viaPass.dekId).toBe(enabled.dekId)
    expect(getHint(remote.doc.value.wraps)).toBe('later')
  })

  it('keeps the slices intact when wraps are rewritten', async () => {
    const remote = fakeRemote()
    await enableSyncEncryption({ passphrase: PASSPHRASE, state: state(), ...remote })
    const before = JSON.stringify(remote.doc.value.slices)

    await updateHint({ wraps: remote.doc.value.wraps, hint: 'x', pushWraps: remote.pushWraps })
    expect(JSON.stringify(remote.doc.value.slices)).toBe(before)
  })
})

describe('changing secrets', () => {
  it('changes the passphrase and keeps the key', async () => {
    const remote = fakeRemote()
    const enabled = await enableSyncEncryption({
      passphrase: PASSPHRASE, state: state(), ...remote,
    })

    await updatePassphrase({
      wraps: remote.doc.value.wraps,
      currentSlot: SLOT_PASSPHRASE,
      currentSecret: PASSPHRASE,
      passphrase: 'brand-new-secret',
      pushWraps: remote.pushWraps,
    })

    const unlocked = await unwrapDek(remote.doc.value.wraps, SLOT_PASSPHRASE, 'brand-new-secret')
    expect(unlocked.dekId).toBe(enabled.dekId)
    await expect(unwrapDek(remote.doc.value.wraps, SLOT_PASSPHRASE, PASSPHRASE))
      .rejects.toThrow('wrap-unlock-failed')
  })

  it('regenerates the recovery code and keeps the key', async () => {
    const remote = fakeRemote()
    const enabled = await enableSyncEncryption({
      passphrase: PASSPHRASE, state: state(), ...remote,
    })

    const result = await replaceRecoveryCode({
      wraps: remote.doc.value.wraps,
      currentSlot: SLOT_PASSPHRASE,
      currentSecret: PASSPHRASE,
      pushWraps: remote.pushWraps,
    })

    const unlocked = await unwrapDek(remote.doc.value.wraps, SLOT_RECOVERY_CODE, result.recoveryCode)
    expect(unlocked.dekId).toBe(enabled.dekId)
    await expect(unwrapDek(remote.doc.value.wraps, SLOT_RECOVERY_CODE, enabled.recoveryCode))
      .rejects.toThrow('wrap-unlock-failed')
  })

  it('refuses a wrong current passphrase', async () => {
    const remote = fakeRemote()
    await enableSyncEncryption({ passphrase: PASSPHRASE, state: state(), ...remote })

    await expect(updatePassphrase({
      wraps: remote.doc.value.wraps,
      currentSlot: SLOT_PASSPHRASE,
      currentSecret: 'wrong',
      passphrase: 'whatever',
      pushWraps: remote.pushWraps,
    })).rejects.toThrow('wrap-unlock-failed')
  })
})
