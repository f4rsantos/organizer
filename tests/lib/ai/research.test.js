import { describe, it, expect, vi } from 'vitest'
import { performResearch, hasGroundingCapability } from '../../../src/lib/ai/research'

describe('hasGroundingCapability', () => {
  it('is true for gemini', () => {
    expect(hasGroundingCapability('gemini')).toBe(true)
  })

  it('is false for anthropic', () => {
    expect(hasGroundingCapability('anthropic')).toBe(false)
  })

  it('is false for an unknown provider', () => {
    expect(hasGroundingCapability('nope')).toBe(false)
  })
})

describe('performResearch gating', () => {
  it('refuses cleanly when the provider lacks grounding', async () => {
    const result = await performResearch({ query: 'weather in Lisbon', provider: 'anthropic' })
    expect(result.ok).toBe(false)
    expect(result.error.kind).toBe('unsupported')
    expect(result.findings).toBe('')
    expect(result.sources).toEqual([])
  })

  it('refuses cleanly with no provider configured', async () => {
    const result = await performResearch({ query: 'weather in Lisbon', provider: undefined })
    expect(result.ok).toBe(false)
    expect(result.error.kind).toBe('unsupported')
  })

  it('rejects an empty query before touching the provider', async () => {
    const result = await performResearch({ query: '', provider: 'gemini' })
    expect(result.ok).toBe(false)
    expect(result.error.kind).toBe('invalid')
  })
})

describe('performResearch happy path', () => {
  it('shapes a successful grounded search into findings and sources', async () => {
    const send = vi.fn().mockResolvedValue({
      ok: true,
      json: {
        candidates: [{
          content: { parts: [{ text: 'Lisbon is sunny.' }] },
          groundingMetadata: {
            groundingChunks: [{ web: { title: 'Weather site', uri: 'https://example.com/lisbon' } }],
          },
        }],
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 7 },
      },
    })

    const result = await performResearch({
      query: 'weather in Lisbon',
      provider: 'gemini',
      credentials: { apiKey: 'key' },
      model: 'gemini-pro',
      send,
    })

    expect(send).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
    expect(result.findings).toBe('Lisbon is sunny.')
    expect(result.sources).toEqual([{ title: 'Weather site', url: 'https://example.com/lisbon' }])
    expect(result.usage).toEqual({ inputTokens: 5, outputTokens: 7 })
  })

  it('surfaces a transport failure as a plain error result', async () => {
    const send = vi.fn().mockResolvedValue({ ok: false, error: { kind: 'network', message: 'down' } })

    const result = await performResearch({
      query: 'weather in Lisbon',
      provider: 'gemini',
      credentials: { apiKey: 'key' },
      model: 'gemini-pro',
      send,
    })

    expect(result.ok).toBe(false)
    expect(result.error).toEqual({ kind: 'network', message: 'down' })
    expect(result.findings).toBe('')
    expect(result.sources).toEqual([])
  })

  it('drops sources with no url', async () => {
    const send = vi.fn().mockResolvedValue({
      ok: true,
      json: {
        candidates: [{
          content: { parts: [{ text: 'Some findings.' }] },
          groundingMetadata: {
            groundingChunks: [{ web: { title: 'No url here' } }],
          },
        }],
      },
    })

    const result = await performResearch({
      query: 'anything',
      provider: 'gemini',
      credentials: { apiKey: 'key' },
      model: 'gemini-pro',
      send,
    })

    expect(result.ok).toBe(true)
    expect(result.sources).toEqual([])
  })
})
