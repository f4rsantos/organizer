import { describe, it, expect } from 'vitest'
import { createInviteToken, createTokenSalt, hashToken, matchesTokenHash, createKeyProof, matchesKeyProof } from './token.js'

describe('invite tokens', () => {
  it('is 16 bytes of hex', () => {
    expect(createInviteToken()).toMatch(/^[0-9a-f]{32}$/)
  })

  it('does not repeat', () => {
    expect(createInviteToken()).not.toBe(createInviteToken())
  })

  it('produces a distinct salt each time', () => {
    expect(createTokenSalt()).not.toBe(createTokenSalt())
  })

  it('produces a 16 byte salt', () => {
    expect(createTokenSalt()).toMatch(/^[0-9a-f]{32}$/)
  })
})

describe('token hashing', () => {
  it('is stable for the same token and salt', async () => {
    const token = createInviteToken()
    const salt = createTokenSalt()
    expect(await hashToken(token, salt)).toBe(await hashToken(token, salt))
  })

  it('differs across salts for the same token', async () => {
    const token = createInviteToken()
    expect(await hashToken(token, createTokenSalt()))
      .not.toBe(await hashToken(token, createTokenSalt()))
  })

  it('differs across tokens for the same salt', async () => {
    const salt = createTokenSalt()
    expect(await hashToken(createInviteToken(), salt))
      .not.toBe(await hashToken(createInviteToken(), salt))
  })

  it('is a full sha-256 digest', async () => {
    expect(await hashToken('x', 'y')).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('token verification', () => {
  it('accepts the matching token', async () => {
    const token = createInviteToken()
    const salt = createTokenSalt()
    const tokenHash = await hashToken(token, salt)
    expect(await matchesTokenHash({ token, salt, tokenHash })).toBe(true)
  })

  it('rejects a different token', async () => {
    const salt = createTokenSalt()
    const tokenHash = await hashToken(createInviteToken(), salt)
    expect(await matchesTokenHash({ token: createInviteToken(), salt, tokenHash })).toBe(false)
  })

  it('rejects the right token under the wrong salt', async () => {
    const token = createInviteToken()
    const tokenHash = await hashToken(token, createTokenSalt())
    expect(await matchesTokenHash({ token, salt: createTokenSalt(), tokenHash })).toBe(false)
  })

  it('rejects a missing token', async () => {
    expect(await matchesTokenHash({ token: null, salt: 'x', tokenHash: 'y' })).toBe(false)
  })

  it('rejects a missing hash', async () => {
    expect(await matchesTokenHash({ token: 'x', salt: 'y', tokenHash: null })).toBe(false)
  })
})

describe('key proof', () => {
  it('accepts the team key it was built from', async () => {
    const salt = createTokenSalt()
    const proofHash = await createKeyProof('team-key-abc', salt)
    expect(await matchesKeyProof({ teamKey: 'team-key-abc', salt, proofHash })).toBe(true)
  })

  it('rejects a different key, and never matches without one', async () => {
    const salt = createTokenSalt()
    const proofHash = await createKeyProof('team-key-abc', salt)
    expect(await matchesKeyProof({ teamKey: 'team-key-xyz', salt, proofHash })).toBe(false)
    expect(await matchesKeyProof({ teamKey: null, salt, proofHash })).toBe(false)
    expect(await matchesKeyProof({ teamKey: 'team-key-abc', salt, proofHash: null })).toBe(false)
  })

  it('does not reuse a hash across salts', async () => {
    const proofHash = await createKeyProof('team-key-abc', createTokenSalt())
    const otherSalt = createTokenSalt()
    expect(await matchesKeyProof({ teamKey: 'team-key-abc', salt: otherSalt, proofHash })).toBe(false)
  })
})
