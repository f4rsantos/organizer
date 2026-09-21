import { describe, it, expect } from 'vitest'
import { shouldPromptAliasForMembership, nextAliasPromptTeamId } from '../../../src/lib/collab/aliasPrompt.js'

describe('shouldPromptAliasForMembership', () => {
  it('prompts for a membership never prompted before', () => {
    expect(shouldPromptAliasForMembership({ teamId: 'team_a' }, [])).toBe(true)
    expect(shouldPromptAliasForMembership({ teamId: 'team_a' }, ['team_b'])).toBe(true)
  })

  it('does not prompt again once the team id is recorded', () => {
    expect(shouldPromptAliasForMembership({ teamId: 'team_a' }, ['team_a'])).toBe(false)
  })

  it('handles missing membership or list defensively', () => {
    expect(shouldPromptAliasForMembership(null, ['team_a'])).toBe(false)
    expect(shouldPromptAliasForMembership({ teamId: 'team_a' }, undefined)).toBe(true)
    expect(shouldPromptAliasForMembership({}, [])).toBe(false)
  })
})

describe('nextAliasPromptTeamId', () => {
  it('returns the first membership still needing a prompt', () => {
    const memberships = [{ teamId: 'team_a' }, { teamId: 'team_b' }]
    expect(nextAliasPromptTeamId(memberships, ['team_a'])).toBe('team_b')
  })

  it('returns null when every membership was already prompted', () => {
    const memberships = [{ teamId: 'team_a' }]
    expect(nextAliasPromptTeamId(memberships, ['team_a'])).toBeNull()
  })

  it('returns null for an empty membership list', () => {
    expect(nextAliasPromptTeamId([], [])).toBeNull()
    expect(nextAliasPromptTeamId(undefined, undefined)).toBeNull()
  })
})
