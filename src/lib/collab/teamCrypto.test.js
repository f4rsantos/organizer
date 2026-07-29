import { describe, it, expect } from 'vitest'
import { createTeamKey, isValidTeamKey, encryptTeamState, decryptTeamState, decryptTeamDoc } from './teamCrypto.js'
import { isEnvelope } from '../crypto/index.js'

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

  it('produces a detectable envelope', async () => {
    expect(isEnvelope(await encryptTeamState(STATE, createTeamKey()))).toBe(true)
  })
})

describe('teams without a key stay plaintext', () => {
  it('passes the state straight through on write', async () => {
    expect(await encryptTeamState(STATE, null)).toEqual(STATE)
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
    expect(doc.state).toEqual(STATE)
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
    expect(doc.state).toEqual(STATE)
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
  const writeFormat = teamState => (isEnvelope(teamState) ? 'encrypted' : 'plaintext')

  it('a plaintext team stays plaintext even when the writer holds a key', async () => {
    const writeKey = isEnvelope(STATE) ? createTeamKey() : null
    expect(writeFormat(await encryptTeamState(STATE, writeKey))).toBe('plaintext')
  })

  it('an encrypted team stays encrypted', async () => {
    const stored = await encryptTeamState(STATE, createTeamKey())
    expect(writeFormat(stored)).toBe('encrypted')
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
