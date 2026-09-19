import { describe, it, expect } from 'vitest'
import { geminiProvider } from '@/lib/ai/providers/gemini'
import { buildNeutralTools } from '@/lib/ai/tools'

const SAMPLE_MESSAGES = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Create a task called Buy milk.' },
  { role: 'assistant', content: 'Sure, one moment.' },
]

describe('geminiProvider.buildRequest', () => {
  it('puts the API key in the x-goog-api-key header, never anywhere in the URL', () => {
    const secretKey = 'AIzaSyD-super-secret-key'
    const { url, init } = geminiProvider.buildRequest({
      apiKey: secretKey,
      model: 'gemini-2.5-pro',
      messages: SAMPLE_MESSAGES,
      tools: [],
      stream: false,
    })
    expect(url).not.toContain(secretKey)
    expect(url).not.toContain('key=')
    expect(init.headers['x-goog-api-key']).toBe(secretKey)
  })

  it('puts the model id in the URL path and uses generateContent when not streaming', () => {
    const { url } = geminiProvider.buildRequest({
      apiKey: 'k',
      model: 'gemini-2.5-pro',
      messages: SAMPLE_MESSAGES,
      tools: [],
      stream: false,
    })
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent')
  })

  it('uses streamGenerateContent when stream is true', () => {
    const { url } = geminiProvider.buildRequest({
      apiKey: 'k',
      model: 'gemini-2.5-pro',
      messages: SAMPLE_MESSAGES,
      tools: [],
      stream: true,
    })
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent')
  })

  it('maps assistant role to model and keeps user as user', () => {
    const { init } = geminiProvider.buildRequest({
      apiKey: 'k',
      model: 'gemini-2.5-pro',
      messages: SAMPLE_MESSAGES,
      tools: [],
    })
    const body = JSON.parse(init.body)
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'Create a task called Buy milk.' }] },
      { role: 'model', parts: [{ text: 'Sure, one moment.' }] },
    ])
  })

  it('moves the system message to top-level systemInstruction, not a content entry', () => {
    const { init } = geminiProvider.buildRequest({
      apiKey: 'k',
      model: 'gemini-2.5-pro',
      messages: SAMPLE_MESSAGES,
      tools: [],
    })
    const body = JSON.parse(init.body)
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'You are a helpful assistant.' }] })
    expect(body.contents.some(entry => entry.role === 'system')).toBe(false)
  })

  it('translates neutral tools into a single tools entry with a functionDeclarations array', () => {
    const tools = buildNeutralTools({ optimizeFor: 'requests' })
    const { init } = geminiProvider.buildRequest({
      apiKey: 'k',
      model: 'gemini-2.5-pro',
      messages: SAMPLE_MESSAGES,
      tools,
    })
    const body = JSON.parse(init.body)
    expect(body.tools).toHaveLength(1)
    expect(Array.isArray(body.tools[0].functionDeclarations)).toBe(true)
    expect(body.tools[0].functionDeclarations).toHaveLength(tools.length)
    expect(body.tools[0].functionDeclarations[0].name).toBe(tools[0].name)
  })

  it('strips additionalProperties and $schema from tool parameter schemas', () => {
    const tools = [
      {
        name: 'weird',
        description: 'weird tool',
        parameters: {
          type: 'object',
          $schema: 'http://json-schema.org/draft-07/schema#',
          additionalProperties: false,
          properties: { x: { type: 'string' } },
        },
      },
    ]
    const { init } = geminiProvider.buildRequest({
      apiKey: 'k',
      model: 'gemini-2.5-pro',
      messages: SAMPLE_MESSAGES,
      tools,
    })
    const body = JSON.parse(init.body)
    const declared = body.tools[0].functionDeclarations[0]
    expect(declared.parameters).not.toHaveProperty('additionalProperties')
    expect(declared.parameters).not.toHaveProperty('$schema')
    expect(declared.parameters).toEqual({ type: 'object', properties: { x: { type: 'string' } } })
  })

  it('nests maxTokens under generationConfig.maxOutputTokens', () => {
    const { init } = geminiProvider.buildRequest({
      apiKey: 'k',
      model: 'gemini-2.5-pro',
      messages: SAMPLE_MESSAGES,
      tools: [],
      maxTokens: 2048,
    })
    const body = JSON.parse(init.body)
    expect(body.generationConfig.maxOutputTokens).toBe(2048)
  })

  it('does not call fetch, only returns url and init', () => {
    const result = geminiProvider.buildRequest({
      apiKey: 'k',
      model: 'gemini-2.5-pro',
      messages: SAMPLE_MESSAGES,
      tools: [],
    })
    expect(result).toHaveProperty('url')
    expect(result).toHaveProperty('init')
    expect(typeof result.init.body).toBe('string')
  })
})

describe('geminiProvider.parseResponse', () => {
  it('parses mixed text and functionCall parts', () => {
    const json = {
      candidates: [
        {
          finishReason: 'STOP',
          content: {
            parts: [
              { text: 'Sure, ' },
              { text: 'creating that now.' },
              { functionCall: { name: 'create', args: { type: 'task', items: [{ type: 'task', fields: { title: 'Buy milk' } }] } } },
            ],
          },
        },
      ],
      usageMetadata: { promptTokenCount: 55, candidatesTokenCount: 12 },
    }
    const result = geminiProvider.parseResponse(json)
    expect(result.text).toBe('Sure, creating that now.')
    expect(result.toolCalls).toEqual([
      {
        id: 'create_2',
        name: 'create',
        args: { type: 'task', items: [{ type: 'task', fields: { title: 'Buy milk' } }] },
      },
    ])
    expect(result.finishReason).toBe('STOP')
    expect(result.usage).toEqual({ inputTokens: 55, outputTokens: 12 })
  })

  it('leaves functionCall.args as an object in the neutral shape, matching other adapters', () => {
    const json = {
      candidates: [
        { content: { parts: [{ functionCall: { name: 'create', args: { type: 'task', items: [] } } }] } },
      ],
    }
    const result = geminiProvider.parseResponse(json)
    expect(result.toolCalls[0].args).toEqual({ type: 'task', items: [] })
    expect(typeof result.toolCalls[0].args).toBe('object')
  })

  it('synthesises deterministic ids from function name and part index', () => {
    const json = {
      candidates: [
        {
          content: {
            parts: [
              { text: 'thinking' },
              { functionCall: { name: 'fetch', args: {} } },
              { functionCall: { name: 'query', args: {} } },
            ],
          },
        },
      ],
    }
    const result = geminiProvider.parseResponse(json)
    expect(result.toolCalls).toEqual([
      { id: 'fetch_1', name: 'fetch', args: {} },
      { id: 'query_2', name: 'query', args: {} },
    ])
  })

  it('degrades rather than throws on malformed or empty responses', () => {
    expect(() => geminiProvider.parseResponse({})).not.toThrow()
    expect(() => geminiProvider.parseResponse(null)).not.toThrow()
    const result = geminiProvider.parseResponse({})
    expect(result.text).toBe('')
    expect(result.toolCalls).toEqual([])
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 })
  })
})

describe('geminiProvider.parseError', () => {
  it('maps 401 / UNAUTHENTICATED to auth', () => {
    expect(geminiProvider.parseError(401, { error: { status: 'UNAUTHENTICATED', message: 'bad key' } }).kind).toBe('auth')
  })

  it('maps 429 / RESOURCE_EXHAUSTED to rateLimit', () => {
    expect(geminiProvider.parseError(429, { error: { status: 'RESOURCE_EXHAUSTED', message: 'slow down' } }).kind).toBe('rateLimit')
  })

  it('maps 404 / NOT_FOUND to noSuchModel', () => {
    expect(geminiProvider.parseError(404, { error: { status: 'NOT_FOUND', message: 'model: gemini-x' } }).kind).toBe('noSuchModel')
  })

  it('falls back to unknown for unmapped statuses', () => {
    expect(geminiProvider.parseError(400, { error: { status: 'INVALID_ARGUMENT', message: 'bad request' } }).kind).toBe('unknown')
  })
})
