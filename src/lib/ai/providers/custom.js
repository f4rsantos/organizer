const DEFAULT_CHAT_PATH = '/chat/completions'

function toFunctionTool(tool) {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }
}

function toChatMessages(messages) {
  return (messages ?? []).map(message => ({
    role: message.role,
    content: message.content,
  }))
}

function parseToolCallArgs(rawArgs) {
  if (typeof rawArgs !== 'string') return rawArgs ?? {}
  try {
    return JSON.parse(rawArgs)
  } catch {
    return {}
  }
}

function normalizeUrl(baseUrl) {
  const trimmed = (baseUrl ?? '').replace(/\/+$/, '')
  if (trimmed.endsWith('/chat/completions')) return trimmed
  return `${trimmed}${DEFAULT_CHAT_PATH}`
}

export const customProvider = {
  id: 'custom',
  label: 'OpenAI-compatible',
  capabilities: { tools: true, grounding: false, parallelToolCalls: true, enumerableModels: false },
  requiresBaseUrl: true,

  buildRequest({ baseUrl, apiKey, model, messages, tools, stream }) {
    const url = normalizeUrl(baseUrl)
    const body = {
      model,
      messages: toChatMessages(messages),
      stream: stream ?? false,
    }
    if (tools?.length) {
      body.tools = tools.map(toFunctionTool)
    }
    const headers = { 'Content-Type': 'application/json' }
    const trimmedKey = (apiKey ?? '').trim()
    if (trimmedKey) {
      headers.Authorization = `Bearer ${trimmedKey}`
    }
    return {
      url,
      init: {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      },
    }
  },

  parseResponse(json) {
    const choice = json?.choices?.[0]
    const message = choice?.message ?? {}
    const rawToolCalls = message.tool_calls ?? []
    const toolCalls = rawToolCalls.map(call => ({
      id: call?.id ?? '',
      name: call?.function?.name ?? '',
      args: parseToolCallArgs(call?.function?.arguments),
    }))
    return {
      text: message.content ?? '',
      toolCalls,
      finishReason: choice?.finish_reason ?? null,
      usage: {
        inputTokens: json?.usage?.prompt_tokens ?? 0,
        outputTokens: json?.usage?.completion_tokens ?? 0,
      },
    }
  },

  parseError(status, json) {
    const message = json?.error?.message ?? json?.message ?? `HTTP ${status}`
    if (status === 401 || status === 403) {
      return { kind: 'auth', message }
    }
    if (status === 429) {
      return { kind: 'rateLimit', message }
    }
    if (status === 404) {
      return { kind: 'noSuchModel', message }
    }
    const lowerMessage = message.toLowerCase()
    if (lowerMessage.includes('model') && (lowerMessage.includes('not found') || lowerMessage.includes('does not exist'))) {
      return { kind: 'noSuchModel', message }
    }
    if (lowerMessage.includes('does not support tools') || (lowerMessage.includes('tool') && lowerMessage.includes('not supported'))) {
      return { kind: 'noToolSupport', message }
    }
    if (status >= 500) {
      return { kind: 'network', message }
    }
    return { kind: 'unknown', message }
  },
}
