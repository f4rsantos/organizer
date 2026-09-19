import { getProvider } from '@/lib/ai/providers/index'

export function hasGroundingCapability(providerId) {
  return Boolean(getProvider(providerId)?.capabilities?.grounding)
}

function unsupportedResult(providerId) {
  return {
    ok: false,
    findings: '',
    sources: [],
    error: { kind: 'unsupported', message: `Provider ${providerId ?? '(none)'} does not support grounded research` },
  }
}

function toSources(rawSources) {
  if (!Array.isArray(rawSources)) return []
  return rawSources
    .map(source => ({ title: source?.title ?? source?.url ?? '', url: source?.url ?? '' }))
    .filter(source => source.url)
}

export async function performResearch({ query, provider, credentials, model, send }) {
  if (!query) {
    return { ok: false, findings: '', sources: [], error: { kind: 'invalid', message: 'Missing query' } }
  }

  if (!hasGroundingCapability(provider)) {
    return unsupportedResult(provider)
  }

  const adapter = getProvider(provider)

  if (typeof adapter.search !== 'function') {
    return unsupportedResult(provider)
  }

  const result = await adapter.search({
    query,
    baseUrl: credentials?.baseUrl,
    apiKey: credentials?.apiKey,
    model,
    send,
  })

  if (!result?.ok) {
    return {
      ok: false,
      findings: '',
      sources: [],
      error: result?.error ?? { kind: 'unknown', message: 'Research request failed' },
    }
  }

  return {
    ok: true,
    findings: result.text ?? '',
    sources: toSources(result.sources),
    usage: result.usage ?? { inputTokens: 0, outputTokens: 0 },
  }
}
