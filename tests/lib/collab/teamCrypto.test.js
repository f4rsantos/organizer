import { describe, it, expect } from 'vitest'
import {
  createTeamKey, isValidTeamKey, encryptTeamState, decryptTeamState, decryptTeamDoc,
  isEncryptedTeamState, withTeamStateDefaults, TEAM_SLICES,
} from '../../../src/lib/collab/teamCrypto.js'
import { createTeamState } from '../../../src/lib/collab/schema.js'

const STATE = { tasks: [{ id: 't1', title: 'shared secret' }] }

describe('team keys', () => {
  it('creates a valid key', () => {
    expect(isValidTeamKey(createTeamKey())).toBe(true)
  })

  it('creates a different key each time', () => {
    expect(createTeamKey()).not.toBe(createTeamKey())
  })

  it('rejects a malformed key', () => {
    expect(isValidTeamKey('nope')).toBe(false)
  })
})

describe('round trip', () => {
  it('restores the state', async () => {
    const key = createTeamKey()
    expect(await decryptTeamState(await encryptTeamState(STATE, key), key)).toEqual(STATE)
  })

  it('writes an envelope, not readable text', async () => {
    const envelope = await encryptTeamState(STATE, createTeamKey())
    expect(JSON.stringify(envelope)).not.toContain('shared secret')
  })

  it('produces a detectable encrypted container', async () => {
    expect(isEncryptedTeamState(await encryptTeamState(STATE, createTeamKey()))).toBe(true)
  })
})

describe('teams without a key stay plaintext', () => {
  it('writes a plaintext container when there is no key', async () => {
    const stored = await encryptTeamState(STATE, null)
    expect(isEncryptedTeamState(stored)).toBe(false)
    expect(await decryptTeamState(stored, null)).toEqual({ tasks: STATE.tasks })
  })

  it('reads a legacy plaintext state back', async () => {
    expect(await decryptTeamState(STATE, null)).toEqual(STATE)
  })

  it('reads legacy plaintext even when a key is present', async () => {
    expect(await decryptTeamState(STATE, createTeamKey())).toEqual(STATE)
  })
})

describe('a wrong or missing key never yields state', () => {
  it('returns null for the wrong key', async () => {
    const envelope = await encryptTeamState(STATE, createTeamKey())
    expect(await decryptTeamState(envelope, createTeamKey())).toBe(null)
  })

  it('returns null when no key is held', async () => {
    const envelope = await encryptTeamState(STATE, createTeamKey())
    expect(await decryptTeamState(envelope, null)).toBe(null)
  })

  it('does not throw on a wrong key', async () => {
    const envelope = await encryptTeamState(STATE, createTeamKey())
    await expect(decryptTeamState(envelope, createTeamKey())).resolves.toBe(null)
  })
})

describe('decryptTeamDoc', () => {
  const TEAM_ID = 'team1'
  const team = state => ({ id: TEAM_ID, name: 'Study group', state })
  const stored = key => encryptTeamState(STATE, key, TEAM_ID)

  it('unwraps an encrypted team', async () => {
    const key = createTeamKey()
    const doc = await decryptTeamDoc(team(await stored(key)), key)
    expect(doc.state).toMatchObject(STATE)
    expect(doc.locked).toBe(false)
  })

  it('marks a team locked when the key does not match', async () => {
    const doc = await decryptTeamDoc(team(await stored(createTeamKey())), createTeamKey())
    expect(doc.locked).toBe(true)
    expect(doc.state).toBe(null)
  })

  it('keeps team metadata readable while locked', async () => {
    const doc = await decryptTeamDoc(team(await stored(createTeamKey())), null)
    expect(doc.name).toBe('Study group')
  })

  it('passes a plaintext team through unlocked', async () => {
    const doc = await decryptTeamDoc(team(STATE), null)
    expect(doc.state).toMatchObject(STATE)
    expect(doc.locked).toBe(false)
  })

  it('returns null for a missing team', async () => {
    expect(await decryptTeamDoc(null, createTeamKey())).toBe(null)
  })

  it('falls back to an empty team state when the doc has none', async () => {
    const doc = await decryptTeamDoc({ id: 'team1' }, null)
    expect(doc.state).toBeTruthy()
    expect(doc.locked).toBe(false)
  })
})

describe('a team never changes format mid-life', () => {
  const writeFormat = teamState => (isEncryptedTeamState(teamState) ? 'encrypted' : 'plaintext')

  it('a plaintext team stays plaintext even when the writer holds a key', async () => {
    const writeKey = isEncryptedTeamState(STATE) ? createTeamKey() : null
    expect(writeFormat(await encryptTeamState(STATE, writeKey))).toBe('plaintext')
  })

  it('an encrypted team stays encrypted', async () => {
    expect(writeFormat(await encryptTeamState(STATE, createTeamKey()))).toBe('encrypted')
  })
})

describe('the team key is independent of the organizer key', () => {
  it('two teams get different keys', () => {
    expect(createTeamKey()).not.toBe(createTeamKey())
  })

  it('a team key cannot read another team', async () => {
    const [a, b] = [createTeamKey(), createTeamKey()]
    expect(await decryptTeamState(await encryptTeamState(STATE, a), b)).toBe(null)
  })
})

describe('a team payload is bound to its document', () => {
  it('refuses a payload copied into another team id', async () => {
    const key = createTeamKey()
    const stored = await encryptTeamState(STATE, key, 'teamA')
    expect(await decryptTeamState(stored, key, 'teamB')).toBe(null)
  })

  it('reads the payload back under its own team id', async () => {
    const key = createTeamKey()
    const stored = await encryptTeamState(STATE, key, 'teamA')
    expect(await decryptTeamState(stored, key, 'teamA')).toEqual(STATE)
  })

  it('locks a doc whose payload came from another team', async () => {
    const key = createTeamKey()
    const stored = await encryptTeamState(STATE, key, 'teamA')
    const doc = await decryptTeamDoc({ id: 'teamB', name: 'Copied', state: stored }, key)
    expect(doc.locked).toBe(true)
    expect(doc.state).toBe(null)
  })
})

describe('every state key createTeamState declares', () => {
  it('is persisted, so no slice is silently dropped on write', () => {
    expect(TEAM_SLICES.slice().sort()).toEqual(Object.keys(createTeamState()).sort())
  })

  it('survives an encrypt and decrypt round trip', async () => {
    const key = createTeamKey()
    const state = {
      ...createTeamState(),
      events: [{ id: 'e1', title: 'Shared event', start: 1, end: 2 }],
    }
    const restored = await decryptTeamState(await encryptTeamState(state, key, 'teamA'), key, 'teamA')
    expect(restored).toEqual(state)
  })
})

describe('the notes slice', () => {
  const persistedSlices = state => Object.fromEntries(TEAM_SLICES.map(slice => [slice, state[slice]]))
  const NOTES_STATE = persistedSlices({
    ...createTeamState(),
    notes: [{ id: 'n1', title: 'Shared note', ydocState: 'AQEB', createdBy: 'p1', createdAt: 1, updatedAt: 2, updatedBy: 'p1' }],
  })

  it('is encrypted like every other slice', () => {
    expect(TEAM_SLICES).toContain('notes')
  })

  it('round trips through encrypt and decrypt', async () => {
    const key = createTeamKey()
    const stored = await encryptTeamState(NOTES_STATE, key, 'teamA')
    expect(await decryptTeamState(stored, key, 'teamA')).toEqual(NOTES_STATE)
  })

  it('does not leak note content into the stored payload', async () => {
    const stored = await encryptTeamState(NOTES_STATE, createTeamKey(), 'teamA')
    expect(JSON.stringify(stored)).not.toContain('Shared note')
    expect(JSON.stringify(stored)).not.toContain('AQEB')
  })

  it('is bound to its own slice aad', async () => {
    const key = createTeamKey()
    const stored = await encryptTeamState(NOTES_STATE, key, 'teamA')
    const swapped = { ...stored, slices: { ...stored.slices, notes: stored.slices.tasks } }
    expect(await decryptTeamState(swapped, key, 'teamA')).toBe(null)
  })
})

describe('backward compatibility with teams created before notes existed', () => {
  const legacyState = { tasks: [{ id: 't1' }], kanban: { columns: [], cards: [] } }

  it('decrypts an old encrypted doc and defaults the missing slice', async () => {
    const key = createTeamKey()
    const stored = await encryptTeamState(legacyState, key, 'legacy')
    expect(stored.slices.notes).toBe(null)

    const doc = await decryptTeamDoc({ id: 'legacy', state: stored }, key)
    expect(doc.locked).toBe(false)
    expect(doc.state.notes).toEqual([])
    expect(doc.state.tasks).toEqual(legacyState.tasks)
  })

  it('defaults a plaintext doc with no notes key', async () => {
    const doc = await decryptTeamDoc({ id: 'legacy', state: legacyState }, null)
    expect(doc.state.notes).toEqual([])
  })

  it('fills every declared slice, never null', () => {
    const filled = withTeamStateDefaults({ tasks: [{ id: 't1' }] })
    for (const slice of TEAM_SLICES) expect(filled[slice]).not.toBe(undefined)
    expect(filled.notes).toEqual([])
    expect(filled.tasks).toEqual([{ id: 't1' }])
  })

  it('never clobbers existing notes with the default', () => {
    const notes = [{ id: 'n1' }]
    expect(withTeamStateDefaults({ notes }).notes).toBe(notes)
  })

  it('keeps notePresence out of the encrypted slices and passes it through plainly', async () => {
    const key = createTeamKey()
    const notePresence = { 'note-1__7': { sharedNoteId: 'note-1', clientId: 7, updatedAt: 1 } }
    const stored = await encryptTeamState({ ...STATE, notePresence }, key, 'team-1')
    expect(Object.keys(stored.slices)).toEqual(TEAM_SLICES)
    expect(JSON.stringify(stored)).not.toContain('note-1__7')

    const doc = await decryptTeamDoc({ id: 'team-1', state: stored, notePresence }, key)
    expect(doc.notePresence).toEqual(notePresence)
    expect(doc.state.notePresence).toBe(undefined)
  })
})
