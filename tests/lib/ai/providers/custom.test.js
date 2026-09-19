import { describe, it, expect } from 'vitest'
import { customProvider } from '@/lib/ai/providers/custom'
import { buildNeutralTools } from '@/lib/ai/tools'

const SAMPLE_MESSAGES = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Create a task called Buy milk.' },
]

describe('customProvider.buildRequest', () => {
  it('puts the API key in the Authorization header, never in the URL', () => {
    const { url, init } = customProvider.buildRequest({
      baseUrl: 'https://example.com/v1',
      apiKey: 'sk-super-secret',
      model: 'gpt-test',
      messages: SAMPLE_MESSAGES,
      tools: [],
      stream: false,
    })
    expect(url).not.toContain('sk-super-secret')
    expect(url).not.toContain('key=')
    expect(init.headers.Authorization).toBe('Bearer sk-super-secret')
  })

  it('does not call fetch, only returns url and init', () => {
    const result = customProvider.buildRequest({
      baseUrl: 'https://example.com/v1',
      apiKey: 'k',
      model: 'gpt-test',
      messages: SAMPLE_MESSAGES,
      tools: [],
      stream: false,
    })
    expect(result).toHaveProperty('url')
    expect(result).toHaveProperty('init')
    expect(typeof result.init.body).toBe('string')
  })

  it('translates neutral tool schema into OpenAI function-calling dialect', () => {
    const tools = buildNeutralTools({ optimizeFor: 'requests' })
    const { init } = customProvider.buildRequest({
      baseUrl: 'https://example.com/v1',
      apiKey: 'k',
      model: 'gpt-test',
      messages: SAMPLE_MESSAGES,
      tools,
      stream: false,
    })
    const body = JSON.parse(init.body)
    expect(body.tools[0].type).toBe('function')
    expect(body.tools[0].function.name).toBe('create')
    expect(body.tools[0].function.parameters).toEqual(tools[0].parameters)
  })

  it('appends /chat/completions to a bare base URL', () => {
    const { url } = customProvider.buildRequest({
      baseUrl: 'https://example.com/v1',
      apiKey: 'k',
      model: 'gpt-test',
      messages: SAMPLE_MESSAGES,
      tools: [],
    })
    expect(url).toBe('https://example.com/v1/chat/completions')
  })

  it('omits the Authorization header entirely when no key is configured', () => {
    const { init } = customProvider.buildRequest({
      baseUrl: 'http://localhost:11434/v1',
      apiKey: '',
      model: 'llama3',
      messages: SAMPLE_MESSAGES,
      tools: [],
    })
    expect(init.headers).not.toHaveProperty('Authorization')
  })

  it('omits the Authorization header when the key is only whitespace', () => {
    const { init } = customProvider.buildRequest({
      baseUrl: 'http://localhost:11434/v1',
      apiKey: '   ',
      model: 'llama3',
      messages: SAMPLE_MESSAGES,
      tools: [],
    })
    expect(init.headers).not.toHaveProperty('Authorization')
  })
})

describe('customProvider.parseResponse', () => {
  it('parses a tool-call reply, converting JSON-string arguments to an object', () => {
    const json = {
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            content: null,
            tool_calls: [
              {
                id: 'call_1',
                function: {
                  name: 'create',
                  arguments: '{"type":"task","items":[{"type":"task","fields":{"title":"Buy milk"}}]}',
                },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 42, completion_tokens: 8 },
    }
    const result = customProvider.parseResponse(json)
    expect(result.toolCalls).toEqual([
      {
        id: 'call_1',
        name: 'create',
        args: { type: 'task', items: [{ type: 'task', fields: { title: 'Buy milk' } }] },
      },
    ])
    expect(result.usage).toEqual({ inputTokens: 42, outputTokens: 8 })
    expect(result.finishReason).toBe('tool_calls')
  })

  it('parses a text-only reply', () => {
    const json = {
      choices: [{ finish_reason: 'stop', message: { content: 'Hello there' } }],
      usage: { prompt_tokens: 10, completion_tokens: 3 },
    }
    const result = customProvider.parseResponse(json)
    expect(result.text).toBe('Hello there')
    expect(result.toolCalls).toEqual([])
  })

  it('degrades rather than throws on malformed or empty responses', () => {
    expect(() => customProvider.parseResponse({})).not.toThrow()
    expect(() => customProvider.parseResponse(null)).not.toThrow()
    const result = customProvider.parseResponse({})
    expect(result.text).toBe('')
    expect(result.toolCalls).toEqual([])
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 })
  })

  it('degrades on malformed tool_calls arguments JSON', () => {
    const json = {
      choices: [
        {
          finish_reason: 'tool_calls',
          message: { tool_calls: [{ id: 'x', function: { name: 'create', arguments: '{not json' } }] },
        },
      ],
    }
    const result = customProvider.parseResponse(json)
    expect(result.toolCalls[0].args).toEqual({})
  })
})

describe('customProvider.parseError', () => {
  it('maps 401 to auth', () => {
    expect(customProvider.parseError(401, { error: { message: 'bad key' } }).kind).toBe('auth')
  })

  it('maps 429 to rateLimit', () => {
    expect(customProvider.parseError(429, { error: { message: 'slow down' } }).kind).toBe('rateLimit')
  })

  it('maps 404 to noSuchModel', () => {
    expect(customProvider.parseError(404, { error: { message: 'not found' } }).kind).toBe('noSuchModel')
  })

  it('maps a model-not-found message without a 404 status to noSuchModel', () => {
    const result = customProvider.parseError(400, { error: { message: 'The model gpt-9 does not exist' } })
    expect(result.kind).toBe('noSuchModel')
  })

  it('falls back to unknown for unmapped statuses', () => {
    expect(customProvider.parseError(418, { error: { message: 'teapot' } }).kind).toBe('unknown')
  })
})
