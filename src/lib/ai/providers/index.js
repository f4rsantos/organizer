import { customProvider } from '@/lib/ai/providers/custom'
import { anthropicProvider } from '@/lib/ai/providers/anthropic'

export const PROVIDERS = {
  [customProvider.id]: customProvider,
  [anthropicProvider.id]: anthropicProvider,
}

export function getProvider(id) {
  return PROVIDERS[id] ?? null
}

export function listProviders() {
  return Object.values(PROVIDERS)
}
