import { describe, it, expect } from 'vitest'
import { isMember, isKnownDevice, personForAuthUid, createTeamState } from './schema.js'

describe('isMember', () => {
  it('recognises a member by id', () => {
    expect(isMember({ members: { u_person: { role: 'host' } } }, 'u_person')).toBe(true)
    expect(isMember({ members: { u_person: { role: 'host' } } }, 'u_other')).toBe(false)
    expect(isMember({ members: { u_person: { role: 'host' } } }, null)).toBe(false)
  })
})

describe('personForAuthUid', () => {
  const team = {
    members: { u_person: { role: 'host' } },
    authUids: { uid_phone: 'u_person', uid_laptop: 'u_person' },
  }

  it('maps every device of a person back to the one member entry', () => {
    // Both devices resolve to the same member, which is what stops one human
    // becoming two members in the roster, in doneBy and in assignment.
    expect(personForAuthUid(team, 'uid_phone')).toBe('u_person')
    expect(personForAuthUid(team, 'uid_laptop')).toBe('u_person')
  })

  it('returns null for a device that was never enrolled', () => {
    expect(personForAuthUid(team, 'uid_unknown')).toBeNull()
    expect(personForAuthUid(team, null)).toBeNull()
    expect(personForAuthUid({}, 'uid_phone')).toBeNull()
  })

  it('reports whether this device may write', () => {
    expect(isKnownDevice(team, 'uid_phone')).toBe(true)
    expect(isKnownDevice(team, 'uid_unknown')).toBe(false)
  })
})

describe('createTeamState', () => {
  it('starts with the default columns and no content', () => {
    const state = createTeamState()
    expect(state.tasks).toEqual([])
    expect(state.kanban.columns).toHaveLength(3)
  })
})
