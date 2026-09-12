const ANTHROPIC_API_VERSION = '2023-06-01'
const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MAX_TOKENS = 4096

function toInputSchemaTool(tool) {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }
}

function splitSystemAndMessages(messages) {
  const systemParts = []
  const rest = []
  for (const message of messages ?? []) {
    if (message.role === 'system') {
      systemParts.push(message.content)
    } else {
      rest.push({ role: message.role, content: message.content })
    }
  }
  return { system: systemParts.join('\n\n') || undefined, messages: rest }
}

function joinTextBlocks(contentBlocks) {
  return contentBlocks
    .filter(block => block?.type === 'text')
    .map(block => block.text ?? '')
    .join('')
}

function extractToolCalls(contentBlocks) {
  return contentBlocks
    .filter(block => block?.type === 'tool_use')
    .map(block => ({
      id: block.id ?? '',
      name: block.name ?? '',
      args: block.input ?? {},
    }))
}

export const anthropicProvider = {
  id: 'anthropic',
  label: 'Anthropic',
  capabilities: { tools: true, grounding: false, parallelToolCalls: true, enumerableModels: false },
  requiresBaseUrl: false,

  buildRequest({ apiKey, model, messages, tools, stream, maxTokens }) {
    const { system, messages: chatMessages } = splitSystemAndMessages(messages)
    const body = {
      model,
      max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: chatMessages,
      stream: stream ?? false,
    }
    if (system) {
      body.system = system
    }
    if (tools?.length) {
      body.tools = tools.map(toInputSchemaTool)
    }
    return {
      url: ANTHROPIC_MESSAGES_URL,
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_API_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
      },
    }
  },

  parseResponse(json) {
    const contentBlocks = json?.content ?? []
    return {
      text: joinTextBlocks(contentBlocks),
      toolCalls: extractToolCalls(contentBlocks),
      finishReason: json?.stop_reason ?? null,
      usage: {
        inputTokens: json?.usage?.input_tokens ?? 0,
        outputTokens: json?.usage?.output_tokens ?? 0,
      },
    }
  },

  parseError(status, json) {
    const message = json?.error?.message ?? json?.message ?? `HTTP ${status}`
    const errorType = json?.error?.type ?? ''
    if (status === 401 || errorType === 'authentication_error') {
      return { kind: 'auth', message }
    }
    if (status === 429 || errorType === 'rate_limit_error') {
      return { kind: 'rateLimit', message }
    }
    if (status === 404 || errorType === 'not_found_error') {
      return { kind: 'noSuchModel', message }
    }
    const lowerMessage = message.toLowerCase()
    if (lowerMessage.includes('model') && (lowerMessage.includes('not found') || lowerMessage.includes('does not exist'))) {
      return { kind: 'noSuchModel', message }
    }
    if (lowerMessage.includes('tool') && lowerMessage.includes('not support')) {
      return { kind: 'noToolSupport', message }
    }
    if (status >= 500) {
      return { kind: 'network', message }
    }
    return { kind: 'unknown', message }
  },
}
