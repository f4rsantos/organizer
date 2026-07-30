import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { rotateDek, rotateAndPublish } from './rotation.js'
import { createWraps, unwrapDek, SLOT_PASSPHRASE, SLOT_RECOVERY_CODE } from './wraps.js'
import { encodeSlices, decodeSlices } from './sliceCodec.js'
import { aadForPersonalSlice } from './aad.js'
import { closeDekStore } from './keyStore.js'

const PASSPHRASE = 'purple-tractor-91'
const NEXT_PASSPHRASE = 'orange-lantern-44'
const aadFor = aadForPersonalSlice

const state = () => ({
  version: 7, theme: 'system', lang: 'en', onboardingDone: true,
  tasks: [{ id: 't1', title: 'secret plan' }], notes: [{ id: 'n1' }], settings: { a: 1 },
})

async function setup() {
  const created = await createWraps({ passphrase: PASSPHRASE, hint: 'the usual one' })
  const container = await encodeSlices({ state: state(), key: created.dek, aadFor, rev: 4 })
  return { ...created, container }
}

beforeEach(async () => {
  await closeDekStore()
})

describe('rotating the data key', () => {
  it('produces a new key identity', async () => {
    const base = await setup()
    const rotated = await rotateDek({
      container: base.container, wraps: base.wraps,
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: NEXT_PASSPHRASE, aadFor,
    })

    expect(rotated.dekId).not.toBe(base.dekId)
    expect(rotated.previousDekId).toBe(base.dekId)
  })

  it('preserves every slice through the rotation', async () => {
    const base = await setup()
    const rotated = await rotateDek({
      container: base.container, wraps: base.wraps,
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: NEXT_PASSPHRASE, aadFor,
    })

    const decoded = await decodeSlices({
      container: rotated.container, key: rotated.dek, aadFor,
    })
    expect(decoded.tasks).toEqual(state().tasks)
    expect(decoded.notes).toEqual(state().notes)
    expect(decoded.settings).toEqual(state().settings)
  })

  it('makes the old key useless on the new container', async () => {
    const base = await setup()
    const rotated = await rotateDek({
      container: base.container, wraps: base.wraps,
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: NEXT_PASSPHRASE, aadFor,
    })

    await expect(decodeSlices({ container: rotated.container, key: base.dek, aadFor }))
      .rejects.toThrow()
  })

  it('makes the new key useless on the old container', async () => {
    const base = await setup()
    const rotated = await rotateDek({
      container: base.container, wraps: base.wraps,
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: NEXT_PASSPHRASE, aadFor,
    })

    await expect(decodeSlices({ container: base.container, key: rotated.dek, aadFor }))
      .rejects.toThrow()
  })

  it('rewraps both slots against the new key', async () => {
    const base = await setup()
    const rotated = await rotateDek({
      container: base.container, wraps: base.wraps,
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: NEXT_PASSPHRASE, aadFor,
    })

    const viaPass = await unwrapDek(rotated.wraps, SLOT_PASSPHRASE, NEXT_PASSPHRASE)
    const viaCode = await unwrapDek(rotated.wraps, SLOT_RECOVERY_CODE, rotated.recoveryCode)
    expect(viaPass.dekId).toBe(rotated.dekId)
    expect(viaCode.dekId).toBe(rotated.dekId)
  })

  it('invalidates the old passphrase', async () => {
    const base = await setup()
    const rotated = await rotateDek({
      container: base.container, wraps: base.wraps,
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: NEXT_PASSPHRASE, aadFor,
    })

    await expect(unwrapDek(rotated.wraps, SLOT_PASSPHRASE, PASSPHRASE))
      .rejects.toThrow('wrap-unlock-failed')
  })

  it('invalidates the old recovery code', async () => {
    const base = await setup()
    const rotated = await rotateDek({
      container: base.container, wraps: base.wraps,
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: NEXT_PASSPHRASE, aadFor,
    })

    await expect(unwrapDek(rotated.wraps, SLOT_RECOVERY_CODE, base.recoveryCode))
      .rejects.toThrow('wrap-unlock-failed')
  })

  it('carries the hint across', async () => {
    const base = await setup()
    const rotated = await rotateDek({
      container: base.container, wraps: base.wraps,
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: NEXT_PASSPHRASE, aadFor,
    })
    expect(rotated.wraps.hint).toBe('the usual one')
  })

  it('bumps the revision', async () => {
    const base = await setup()
    const rotated = await rotateDek({
      container: base.container, wraps: base.wraps,
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: NEXT_PASSPHRASE, aadFor,
    })
    expect(rotated.container.rev).toBe(5)
  })

  it('rotates using the recovery code as the current secret', async () => {
    const base = await setup()
    const rotated = await rotateDek({
      container: base.container, wraps: base.wraps,
      currentSlot: SLOT_RECOVERY_CODE, currentSecret: base.recoveryCode,
      passphrase: NEXT_PASSPHRASE, aadFor,
    })
    expect(rotated.dekId).not.toBe(base.dekId)
  })

  it('refuses a wrong current secret', async () => {
    const base = await setup()
    await expect(rotateDek({
      container: base.container, wraps: base.wraps,
      currentSlot: SLOT_PASSPHRASE, currentSecret: 'wrong',
      passphrase: NEXT_PASSPHRASE, aadFor,
    })).rejects.toThrow('wrap-unlock-failed')
  })
})

describe('publishing a rotation atomically', () => {
  it('publishes once and only then commits the key', async () => {
    const base = await setup()
    const calls = []

    await rotateAndPublish({
      container: base.container, wraps: base.wraps,
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: NEXT_PASSPHRASE, aadFor,
      publish: async payload => { calls.push(['publish', payload.dekId]) },
      commit: async () => { calls.push(['commit']) },
    })

    expect(calls.map(c => c[0])).toEqual(['publish', 'commit'])
  })

  it('does not commit the key when publishing fails', async () => {
    const base = await setup()
    let committed = false

    await expect(rotateAndPublish({
      container: base.container, wraps: base.wraps,
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: NEXT_PASSPHRASE, aadFor,
      publish: async () => { throw new Error('network') },
      commit: async () => { committed = true },
    })).rejects.toThrow('network')

    expect(committed).toBe(false)
  })

  it('publishes a complete container, never a partial one', async () => {
    const base = await setup()
    let published = null

    await rotateAndPublish({
      container: base.container, wraps: base.wraps,
      currentSlot: SLOT_PASSPHRASE, currentSecret: PASSPHRASE,
      passphrase: NEXT_PASSPHRASE, aadFor,
      publish: async payload => { published = payload },
      commit: async () => {},
    })

    const decoded = await decodeSlices({
      container: published.container,
      key: (await unwrapDek(published.wraps, SLOT_PASSPHRASE, NEXT_PASSPHRASE)).dek,
      aadFor,
    })
    expect(decoded.tasks).toEqual(state().tasks)
    expect(published.dekId).toBeTruthy()
  })
})
