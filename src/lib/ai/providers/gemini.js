const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

function toFunctionDeclaration(tool) {
  const { additionalProperties: _additionalProperties, $schema: _schema, ...parameters } = tool.parameters ?? {}
  return {
    name: tool.name,
    description: tool.description,
    parameters,
  }
}

function toGeminiRole(role) {
  return role === 'assistant' ? 'model' : 'user'
}

function splitSystemAndContents(messages) {
  const systemParts = []
  const contents = []
  for (const message of messages ?? []) {
    if (message.role === 'system') {
      systemParts.push(message.content)
    } else {
      contents.push({ role: toGeminiRole(message.role), parts: [{ text: message.content ?? '' }] })
    }
  }
  return { system: systemParts.join('\n\n') || undefined, contents }
}

function joinTextParts(parts) {
  return parts
    .filter(part => typeof part?.text === 'string')
    .map(part => part.text)
    .join('')
}

function synthesizeToolCallId(name, index) {
  return `${name}_${index}`
}

async function defaultGroundedFetch({ url, init }) {
  let response
  try {
    response = await fetch(url, init)
  } catch (err) {
    return { ok: false, error: { kind: 'network', message: err?.message ?? 'Network error' } }
  }
  let json = null
  try {
    json = await response.json()
  } catch {
    json = null
  }
  if (!response.ok) {
    return { ok: false, error: { kind: 'unknown', message: json?.error?.message ?? `HTTP ${response.status}` } }
  }
  return { ok: true, json }
}

function extractGroundingSources(candidate) {
  const chunks = candidate?.groundingMetadata?.groundingChunks ?? []
  return chunks
    .map(chunk => ({ title: chunk?.web?.title ?? '', url: chunk?.web?.uri ?? '' }))
    .filter(source => source.url)
}

function extractToolCalls(parts) {
  return parts
    .map((part, index) => ({ part, index }))
    .filter(({ part }) => part?.functionCall)
    .map(({ part, index }) => ({
      id: synthesizeToolCallId(part.functionCall?.name ?? 'call', index),
      name: part.functionCall?.name ?? '',
      args: part.functionCall?.args ?? {},
    }))
}

export const geminiProvider = {
  id: 'gemini',
  label: 'Google Gemini',
  capabilities: { tools: true, grounding: true, parallelToolCalls: true, enumerableModels: false },
  requiresBaseUrl: false,

  buildRequest({ apiKey, model, messages, tools, stream, maxTokens }) {
    const { system, contents } = splitSystemAndContents(messages)
    const body = {
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens ?? undefined,
      },
    }
    if (system) {
      body.systemInstruction = { parts: [{ text: system }] }
    }
    if (tools?.length) {
      body.tools = [{ functionDeclarations: tools.map(toFunctionDeclaration) }]
    }
    const method = stream ? 'streamGenerateContent' : 'generateContent'
    const url = `${GEMINI_API_BASE}/${model}:${method}`
    return {
      url,
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
      },
    }
  },

  parseResponse(json) {
    const candidate = json?.candidates?.[0]
    const parts = candidate?.content?.parts ?? []
    return {
      text: joinTextParts(parts),
      toolCalls: extractToolCalls(parts),
      finishReason: candidate?.finishReason ?? null,
      usage: {
        inputTokens: json?.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: json?.usageMetadata?.candidatesTokenCount ?? 0,
      },
    }
  },

  async search({ query, apiKey, model, send }) {
    const body = {
      contents: [{ role: 'user', parts: [{ text: query }] }],
      tools: [{ googleSearch: {} }],
    }
    const url = `${GEMINI_API_BASE}/${model}:generateContent`
    const init = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    }

    const transport = send ?? defaultGroundedFetch
    const response = await transport({ url, init })

    if (!response.ok) {
      return { ok: false, error: response.error ?? { kind: 'unknown', message: 'Grounded search failed' } }
    }

    const candidate = response.json?.candidates?.[0]
    const parts = candidate?.content?.parts ?? []
    return {
      ok: true,
      text: joinTextParts(parts),
      sources: extractGroundingSources(candidate),
      usage: {
        inputTokens: response.json?.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.json?.usageMetadata?.candidatesTokenCount ?? 0,
      },
    }
  },

  parseError(status, json) {
    const message = json?.error?.message ?? json?.message ?? `HTTP ${status}`
    const errorStatus = json?.error?.status ?? ''
    if (status === 401 || errorStatus === 'UNAUTHENTICATED' || errorStatus === 'PERMISSION_DENIED') {
      return { kind: 'auth', message }
    }
    if (status === 429 || errorStatus === 'RESOURCE_EXHAUSTED') {
      return { kind: 'rateLimit', message }
    }
    if (status === 404 || errorStatus === 'NOT_FOUND') {
      return { kind: 'noSuchModel', message }
    }
    const lowerMessage = message.toLowerCase()
    if (lowerMessage.includes('model') && (lowerMessage.includes('not found') || lowerMessage.includes('does not exist'))) {
      return { kind: 'noSuchModel', message }
    }
    if (lowerMessage.includes('tool') && (lowerMessage.includes('not support') || lowerMessage.includes('not supported'))) {
      return { kind: 'noToolSupport', message }
    }
    if (status >= 500) {
      return { kind: 'network', message }
    }
    return { kind: 'unknown', message }
  },
}
