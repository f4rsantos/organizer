import { describe, it, expect, beforeEach, vi } from 'vitest'
import { buildInviteLink, parseInviteLink } from './link.js'

const BASE = { projectId: 'proj', apiKey: 'api-key', teamId: 'team1', token: 'abc123' }
const KEY = 'A'.repeat(43) + '='

beforeEach(() => {
  vi.stubGlobal('window', { location: { href: 'https://example.com/organizer/?tab=x#old' } })
})

describe('the team key travels in the fragment', () => {
  it('puts the key after the hash', () => {
    expect(buildInviteLink({ ...BASE, teamKey: KEY })).toContain(`#oc_e=${encodeURIComponent(KEY)}`)
  })

  it('keeps the key out of the query string', () => {
    const url = new URL(buildInviteLink({ ...BASE, teamKey: KEY }))
    expect(url.search).not.toContain(KEY)
  })

  it('keeps the key out of everything a server would receive', () => {
    const url = new URL(buildInviteLink({ ...BASE, teamKey: KEY }))
    expect(`${url.origin}${url.pathname}${url.search}`).not.toContain('oc_e')
  })

  it('omits the fragment entirely when there is no key', () => {
    expect(buildInviteLink(BASE)).not.toContain('#')
  })
})

describe('round trip', () => {
  it('recovers the key', () => {
    expect(parseInviteLink(buildInviteLink({ ...BASE, teamKey: KEY })).teamKey).toBe(KEY)
  })

  it('recovers the connection fields', () => {
    expect(parseInviteLink(buildInviteLink({ ...BASE, teamKey: KEY }))).toMatchObject(BASE)
  })

  it('reports a null key for a legacy link', () => {
    expect(parseInviteLink(buildInviteLink(BASE)).teamKey).toBe(null)
  })
})

describe('rejects malformed input', () => {
  it('rejects a link missing the team id', () => {
    expect(parseInviteLink('https://example.com/?oc_p=p&oc_k=k&oc_s=s')).toBe(null)
  })

  it('rejects a non-url', () => {
    expect(parseInviteLink('not a link')).toBe(null)
  })

  it('rejects an empty string', () => {
    expect(parseInviteLink('')).toBe(null)
  })
})

describe('legacy links keep working', () => {
  it('parses a link built before encryption existed', () => {
    const legacy = 'https://example.com/organizer/?oc_p=proj&oc_k=api-key&oc_t=team1&oc_s=abc123'
    expect(parseInviteLink(legacy)).toMatchObject({ ...BASE, teamKey: null })
  })
})
