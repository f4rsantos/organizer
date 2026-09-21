import { getProvider } from '@/lib/ai/providers/index'

const EMPTY_RESPONSE = {
  text: '',
  toolCalls: [],
  finishReason: null,
  usage: { inputTokens: 0, outputTokens: 0 },
}

async function parseJsonSafely(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function send({ provider, baseUrl, apiKey, model, messages, tools, stream, maxTokens }) {
  const adapter = getProvider(provider)
  if (!adapter) {
    return {
      ok: false,
      provider,
      model,
      error: { kind: 'unknown', message: `Unknown provider: ${provider}` },
    }
  }

  const { url, init } = adapter.buildRequest({ baseUrl, apiKey, model, messages, tools, stream, maxTokens })

  let response
  try {
    response = await fetch(url, init)
  } catch (err) {
    return {
      ok: false,
      provider,
      model,
      error: { kind: 'network', message: err?.message ?? 'Network error' },
    }
  }

  const json = await parseJsonSafely(response)

  if (!response.ok) {
    const error = adapter.parseError(response.status, json)
    return { ok: false, provider, model, error }
  }

  const parsed = json ? adapter.parseResponse(json) : EMPTY_RESPONSE
  return {
    ok: true,
    provider,
    model,
    ...parsed,
  }
}

export async function testModel({ provider, baseUrl, apiKey, model }) {
  const adapter = getProvider(provider)
  if (!adapter) {
    return { ok: false, toolSupport: false, error: { kind: 'unknown', message: `Unknown provider: ${provider}` } }
  }

  const probeTools = [
    {
      name: 'ping',
      description: 'Respond with a short acknowledgement',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  ]

  const result = await send({
    provider,
    baseUrl,
    apiKey,
    model,
    messages: [{ role: 'user', content: 'Reply with the single word "ok".' }],
    tools: probeTools,
    stream: false,
    maxTokens: 16,
  })

  if (!result.ok) {
    return { ok: false, toolSupport: false, error: result.error }
  }

  return { ok: true, toolSupport: true, error: null }
}
