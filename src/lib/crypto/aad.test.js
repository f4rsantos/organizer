import { describe, it, expect } from 'vitest'
import {
  aadForLocalSlice, aadForPersonalSlice, aadForTeamSlice,
  aadForExport, aadForShare, aadForWrap,
} from './aad.js'

describe('scope separation', () => {
  it('gives the same slice a different aad per scope', () => {
    const all = [
      aadForLocalSlice('tasks'),
      aadForPersonalSlice('tasks'),
      aadForTeamSlice('team1', 'tasks'),
      aadForExport('tasks'),
    ]
    expect(new Set(all).size).toBe(all.length)
  })

  it('gives each slice a distinct aad', () => {
    expect(aadForLocalSlice('tasks')).not.toBe(aadForLocalSlice('notes'))
  })

  it('gives each team a distinct aad', () => {
    expect(aadForTeamSlice('a', 'tasks')).not.toBe(aadForTeamSlice('b', 'tasks'))
  })

  it('gives each wrap slot a distinct aad', () => {
    expect(aadForWrap('passphrase')).not.toBe(aadForWrap('recoveryCode'))
  })

  it('keeps share separate from every slice scope', () => {
    expect(aadForShare()).not.toBe(aadForLocalSlice('tasks'))
  })
})

describe('component boundaries are unambiguous', () => {
  it('does not let a colon in the team id forge a slice boundary', () => {
    expect(aadForTeamSlice('x:tasks', 'y')).not.toBe(aadForTeamSlice('x', 'tasks:y'))
  })

  it('does not let a shifted split collide', () => {
    expect(aadForTeamSlice('ab', 'c')).not.toBe(aadForTeamSlice('a', 'bc'))
  })

  it('keeps every adversarial pair distinct', () => {
    const pairs = [
      ['x:tasks', 'y'], ['x', 'tasks:y'],
      ['ab', 'c'], ['a', 'bc'],
      ['1:a', 'b'], ['1', 'a:b'],
      ['', 'tasks'], ['tasks', ''],
      ['3:abc', ''], ['', '3:abc'],
      ['team:1', 'notes'], ['team', '1:notes'],
    ]
    const built = pairs.map(([teamId, slice]) => aadForTeamSlice(teamId, slice))
    expect(new Set(built).size).toBe(pairs.length)
  })

  it('encodes the component length so a prefix cannot be reinterpreted', () => {
    expect(aadForLocalSlice('tasks')).toBe('organizer:v1:5:local5:tasks')
  })
})

describe('stability', () => {
  it('is deterministic for the same slot', () => {
    expect(aadForLocalSlice('tasks')).toBe(aadForLocalSlice('tasks'))
  })
})
