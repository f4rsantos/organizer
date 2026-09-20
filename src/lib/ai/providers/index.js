import { customProvider } from '@/lib/ai/providers/custom'
import { anthropicProvider } from '@/lib/ai/providers/anthropic'
import { geminiProvider } from '@/lib/ai/providers/gemini'

export const PROVIDERS = {
  [customProvider.id]: customProvider,
  [anthropicProvider.id]: anthropicProvider,
  [geminiProvider.id]: geminiProvider,
}

export function getProvider(id) {
  return PROVIDERS[id] ?? null
}

export function listProviders() {
  return Object.values(PROVIDERS)
}
