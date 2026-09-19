import { describe, it, expect } from 'vitest'
import { anthropicProvider } from '@/lib/ai/providers/anthropic'
import { customProvider } from '@/lib/ai/providers/custom'
import { buildNeutralTools } from '@/lib/ai/tools'

const SAMPLE_MESSAGES = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Create a task called Buy milk.' },
]

describe('anthropicProvider.buildRequest', () => {
  it('puts the API key in the x-api-key header, never in the URL', () => {
    const { url, init } = anthropicProvider.buildRequest({
      apiKey: 'sk-ant-super-secret',
      model: 'claude-sonnet-5',
      messages: SAMPLE_MESSAGES,
      tools: [],
      stream: false,
    })
    expect(url).not.toContain('sk-ant-super-secret')
    expect(url).not.toContain('key=')
    expect(init.headers['x-api-key']).toBe('sk-ant-super-secret')
  })

  it('sends the required anthropic-version and browser-access headers', () => {
    const { init } = anthropicProvider.buildRequest({
      apiKey: 'k',
      model: 'claude-sonnet-5',
      messages: SAMPLE_MESSAGES,
      tools: [],
    })
    expect(init.headers['anthropic-version']).toBe('2023-06-01')
    expect(init.headers['anthropic-dangerous-direct-browser-access']).toBe('true')
  })

  it('moves the system message to a top-level system field, not a message', () => {
    const { init } = anthropicProvider.buildRequest({
      apiKey: 'k',
      model: 'claude-sonnet-5',
      messages: SAMPLE_MESSAGES,
      tools: [],
    })
    const body = JSON.parse(init.body)
    expect(body.system).toBe('You are a helpful assistant.')
    expect(body.messages.some(message => message.role === 'system')).toBe(false)
    expect(body.messages).toEqual([{ role: 'user', content: 'Create a task called Buy milk.' }])
  })

  it('always sends max_tokens', () => {
    const { init } = anthropicProvider.buildRequest({
      apiKey: 'k',
      model: 'claude-sonnet-5',
      messages: SAMPLE_MESSAGES,
      tools: [],
    })
    const body = JSON.parse(init.body)
    expect(typeof body.max_tokens).toBe('number')
    expect(body.max_tokens).toBeGreaterThan(0)
  })

  it('translates neutral tool schema into input_schema dialect', () => {
    const tools = buildNeutralTools({ optimizeFor: 'requests' })
    const { init } = anthropicProvider.buildRequest({
      apiKey: 'k',
      model: 'claude-sonnet-5',
      messages: SAMPLE_MESSAGES,
      tools,
    })
    const body = JSON.parse(init.body)
    expect(body.tools[0].name).toBe('create')
    expect(body.tools[0].input_schema).toEqual(tools[0].parameters)
    expect(body.tools[0].function).toBeUndefined()
  })

  it('does not call fetch, only returns url and init', () => {
    const result = anthropicProvider.buildRequest({
      apiKey: 'k',
      model: 'claude-sonnet-5',
      messages: SAMPLE_MESSAGES,
      tools: [],
    })
    expect(result).toHaveProperty('url')
    expect(result).toHaveProperty('init')
    expect(typeof result.init.body).toBe('string')
  })
})

describe('anthropicProvider.parseResponse', () => {
  it('parses a tool-use reply, where input is already an object', () => {
    const json = {
      stop_reason: 'tool_use',
      content: [
        { type: 'text', text: 'Sure, creating that now.' },
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'create',
          input: { type: 'task', items: [{ type: 'task', fields: { title: 'Buy milk' } }] },
        },
      ],
      usage: { input_tokens: 55, output_tokens: 12 },
    }
    const result = anthropicProvider.parseResponse(json)
    expect(result.toolCalls).toEqual([
      {
        id: 'toolu_1',
        name: 'create',
        args: { type: 'task', items: [{ type: 'task', fields: { title: 'Buy milk' } }] },
      },
    ])
    expect(result.text).toBe('Sure, creating that now.')
    expect(result.usage).toEqual({ inputTokens: 55, outputTokens: 12 })
    expect(result.finishReason).toBe('tool_use')
  })

  it('joins multiple text blocks into one text field', () => {
    const json = {
      stop_reason: 'end_turn',
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'there' },
      ],
      usage: { input_tokens: 5, output_tokens: 2 },
    }
    const result = anthropicProvider.parseResponse(json)
    expect(result.text).toBe('Hello there')
    expect(result.toolCalls).toEqual([])
  })

  it('degrades rather than throws on malformed or empty responses', () => {
    expect(() => anthropicProvider.parseResponse({})).not.toThrow()
    expect(() => anthropicProvider.parseResponse(null)).not.toThrow()
    const result = anthropicProvider.parseResponse({})
    expect(result.text).toBe('')
    expect(result.toolCalls).toEqual([])
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 })
  })
})

describe('anthropicProvider.parseError', () => {
  it('maps 401 to auth', () => {
    expect(anthropicProvider.parseError(401, { error: { type: 'authentication_error', message: 'bad key' } }).kind).toBe('auth')
  })

  it('maps 429 to rateLimit', () => {
    expect(anthropicProvider.parseError(429, { error: { type: 'rate_limit_error', message: 'slow down' } }).kind).toBe('rateLimit')
  })

  it('maps 404 / not_found_error to noSuchModel', () => {
    expect(anthropicProvider.parseError(404, { error: { type: 'not_found_error', message: 'model: claude-x' } }).kind).toBe('noSuchModel')
  })

  it('falls back to unknown for unmapped statuses', () => {
    expect(anthropicProvider.parseError(400, { error: { type: 'invalid_request_error', message: 'bad request' } }).kind).toBe('unknown')
  })
})

describe('cross-provider neutral shape equivalence', () => {
  it('normalizes an OpenAI-compatible JSON-string tool call and an Anthropic object tool call to the same neutral shape', () => {
    const customJson = {
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
    const anthropicJson = {
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'call_1',
          name: 'create',
          input: { type: 'task', items: [{ type: 'task', fields: { title: 'Buy milk' } }] },
        },
      ],
      usage: { input_tokens: 42, output_tokens: 8 },
    }

    const customResult = customProvider.parseResponse(customJson)
    const anthropicResult = anthropicProvider.parseResponse(anthropicJson)

    expect(customResult.toolCalls).toEqual(anthropicResult.toolCalls)
    expect(customResult.usage).toEqual(anthropicResult.usage)
  })
})
