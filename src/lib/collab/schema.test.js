import { describe, it, expect } from 'vitest'
import { isLegacyIdentityTeam, isMember, createTeamState } from './schema.js'

describe('isMember', () => {
  it('recognises a member by id', () => {
    expect(isMember({ members: { uid_a: { role: 'host' } } }, 'uid_a')).toBe(true)
    expect(isMember({ members: { uid_a: { role: 'host' } } }, 'uid_b')).toBe(false)
  })
})

describe('isLegacyIdentityTeam', () => {
  const legacy = { members: { u_abc_123: { role: 'host' } } }

  it('flags a team whose members predate uid identity', () => {
    // Drives syncStatus 'outdated', which both blocks writes in guard() and
    // renders the hint. Writes would fail the members[request.auth.uid] rule,
    // and no central migration is possible because every user runs their own
    // Firebase project.
    expect(isLegacyIdentityTeam(legacy, 'uid_this_device')).toBe(true)
  })

  it('does not flag a team this device is a member of', () => {
    expect(isLegacyIdentityTeam({ members: { uid_me: {} } }, 'uid_me')).toBe(false)
  })

  it('stays quiet until the device uid is known', () => {
    expect(isLegacyIdentityTeam(legacy, null)).toBe(false)
  })

  it('stays quiet on a locked team, where members cannot be trusted', () => {
    expect(isLegacyIdentityTeam({ ...legacy, locked: true }, 'uid_me')).toBe(false)
  })

  it('stays quiet on an absent or empty members map', () => {
    expect(isLegacyIdentityTeam({ members: {} }, 'uid_me')).toBe(false)
    expect(isLegacyIdentityTeam({}, 'uid_me')).toBe(false)
    expect(isLegacyIdentityTeam(null, 'uid_me')).toBe(false)
  })
})

describe('createTeamState', () => {
  it('starts with the default columns and no content', () => {
    const state = createTeamState()
    expect(state.tasks).toEqual([])
    expect(state.kanban.columns).toHaveLength(3)
  })
})
