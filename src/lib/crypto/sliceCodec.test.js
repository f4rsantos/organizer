import { describe, it, expect } from 'vitest'
import {
  DATA_SLICES, META_KEYS, TRANSIENT_KEYS, encodeSlices, decodeSlices,
  isContainer, isEncryptedContainer, stripTransient,
} from './sliceCodec.js'
import { importRawKey, generateRawKeyString } from './rawKey.js'
import { aadForLocalSlice, aadForPersonalSlice } from './aad.js'

const KEY_STRING = generateRawKeyString()
const key = await importRawKey(KEY_STRING)
const otherKey = await importRawKey(generateRawKeyString())

function fullState() {
  const state = { version: 7, theme: 'dark', lang: 'pt', onboardingDone: true }
  for (const [i, slice] of DATA_SLICES.entries()) {
    state[slice] = { marker: `${slice}-${i}` }
  }
  state.tasks = [{ id: 't1', title: 'secret plan' }]
  return state
}

const encode = (state, extra = {}) => encodeSlices({
  state, key, aadFor: aadForLocalSlice, ...extra,
})

const decode = (container, extra = {}) => decodeSlices({
  container, key, aadFor: aadForLocalSlice, ...extra,
})

describe('round trip', () => {
  it('restores every data slice', async () => {
    const state = fullState()
    const decoded = await decode(await encode(state))
    for (const slice of DATA_SLICES) expect(decoded[slice]).toEqual(state[slice])
  })

  it('restores every meta key', async () => {
    const state = fullState()
    const decoded = await decode(await encode(state))
    for (const meta of META_KEYS) expect(decoded[meta]).toEqual(state[meta])
  })

  it('round trips without a key as plain slices', async () => {
    const state = fullState()
    const container = await encodeSlices({ state, key: null, aadFor: aadForLocalSlice })
    const decoded = await decodeSlices({ container, key: null, aadFor: aadForLocalSlice })
    expect(decoded.tasks).toEqual(state.tasks)
  })

  it('marks an absent slice as null', async () => {
    const state = fullState()
    delete state.holidays
    expect((await encode(state)).slices.holidays).toBe(null)
  })

  it('skips a null slice on decode', async () => {
    const state = fullState()
    delete state.holidays
    expect(await decode(await encode(state))).not.toHaveProperty('holidays')
  })
})

describe('container shape', () => {
  it('is recognisable', async () => {
    expect(isContainer(await encode(fullState()))).toBe(true)
  })

  it('does not mistake a bare state for a container', () => {
    expect(isContainer(fullState())).toBe(false)
  })

  it('does not mistake null for a container', () => {
    expect(isContainer(null)).toBe(false)
  })

  it('reports an encrypted container', async () => {
    expect(isEncryptedContainer(await encode(fullState()))).toBe(true)
  })

  it('reports a plaintext container as unencrypted', async () => {
    const container = await encodeSlices({
      state: fullState(), key: null, aadFor: aadForLocalSlice,
    })
    expect(isEncryptedContainer(container)).toBe(false)
  })

  it('keeps the metadata outside the ciphertext', async () => {
    const container = await encode(fullState())
    expect(container.meta).toEqual({ version: 7, theme: 'dark', lang: 'pt', onboardingDone: true })
  })

  it('hides slice contents', async () => {
    expect(JSON.stringify(await encode(fullState()))).not.toContain('secret plan')
  })

  it('records the revision', async () => {
    expect((await encode(fullState(), { rev: 12 })).rev).toBe(12)
  })
})

describe('transient keys never persist', () => {
  it('strips ui-only keys', () => {
    const stripped = stripTransient({
      ...fullState(), activeTab: 'tasks', resetSignal: 1, collabRuntime: {}, hydrated: true,
    })
    for (const key of TRANSIENT_KEYS) expect(stripped).not.toHaveProperty(key)
  })

  it('keeps every data slice while stripping', () => {
    const stripped = stripTransient({ ...fullState(), activeTab: 'tasks' })
    for (const slice of DATA_SLICES) expect(stripped).toHaveProperty(slice)
  })

  it('never encodes a transient key even when present', async () => {
    const container = await encode({ ...fullState(), activeTab: 'tasks', hydrated: true })
    expect(Object.keys(container.slices)).toEqual(
      expect.not.arrayContaining(TRANSIENT_KEYS),
    )
  })
})

describe('dirty slice reuse', () => {
  it('reuses the previous envelope for clean slices', async () => {
    const state = fullState()
    const first = await encode(state)
    const second = await encode(state, { previousContainer: first, dirtySlices: ['tasks'] })

    expect(second.slices.notes).toBe(first.slices.notes)
    expect(second.slices.settings).toBe(first.slices.settings)
  })

  it('re-encrypts the dirty slice', async () => {
    const state = fullState()
    const first = await encode(state)
    const second = await encode(state, { previousContainer: first, dirtySlices: ['tasks'] })

    expect(second.slices.tasks.ciphertext).not.toBe(first.slices.tasks.ciphertext)
  })

  it('re-encrypts everything when no dirty set is given', async () => {
    const state = fullState()
    const first = await encode(state)
    const second = await encode(state, { previousContainer: first })

    expect(second.slices.notes.ciphertext).not.toBe(first.slices.notes.ciphertext)
  })

  it('still decodes a container built from reused envelopes', async () => {
    const state = fullState()
    const first = await encode(state)
    const second = await encode(
      { ...state, tasks: [{ id: 't2', title: 'next' }] },
      { previousContainer: first, dirtySlices: ['tasks'] },
    )

    const decoded = await decode(second)
    expect(decoded.tasks).toEqual([{ id: 't2', title: 'next' }])
    expect(decoded.notes).toEqual(state.notes)
  })
})

describe('omitted slices', () => {
  it('leaves omitted slices out of the container', async () => {
    const container = await encode(fullState(), { omitted: ['pomodoros'] })
    expect(container.slices).not.toHaveProperty('pomodoros')
  })

  it('records what was omitted', async () => {
    expect((await encode(fullState(), { omitted: ['pomodoros'] })).omitted).toEqual(['pomodoros'])
  })

  it('omits the field entirely when nothing was shed', async () => {
    expect(await encode(fullState())).not.toHaveProperty('omitted')
  })

  it('decodes without the omitted slice', async () => {
    const decoded = await decode(await encode(fullState(), { omitted: ['pomodoros'] }))
    expect(decoded).not.toHaveProperty('pomodoros')
  })
})

describe('slot binding', () => {
  it('refuses a slice envelope moved to another slice', async () => {
    const container = await encode(fullState())
    const swapped = {
      ...container,
      slices: { ...container.slices, notes: container.slices.tasks },
    }
    await expect(decode(swapped)).rejects.toThrow()
  })

  it('refuses a container decoded under another scope', async () => {
    const container = await encode(fullState())
    await expect(decodeSlices({ container, key, aadFor: aadForPersonalSlice })).rejects.toThrow()
  })

  it('refuses the wrong key', async () => {
    const container = await encode(fullState())
    await expect(decodeSlices({ container, key: otherKey, aadFor: aadForLocalSlice }))
      .rejects.toThrow()
  })

  it('requires a key for an encrypted container', async () => {
    const container = await encode(fullState())
    await expect(decodeSlices({ container, key: null, aadFor: aadForLocalSlice }))
      .rejects.toThrow('encryption-key-required')
  })
})

describe('malformed input', () => {
  it('refuses a non-container', async () => {
    await expect(decode(fullState())).rejects.toThrow('container-invalid')
  })

  it('refuses null', async () => {
    await expect(decode(null)).rejects.toThrow('container-invalid')
  })

  it('refuses an unrecognised slice payload', async () => {
    const container = await encode(fullState())
    const broken = { ...container, slices: { ...container.slices, tasks: { junk: true } } }
    await expect(decode(broken)).rejects.toThrow('slice-decrypt-failed')
  })
})
