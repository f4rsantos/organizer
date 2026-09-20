import { readJson, writeJson } from '@/lib/safeStorage'
import { listProviders } from '@/lib/ai/providers'

const KEY_PREFIX = 'f4rsantos.github.io/organizer:ai-key:'
const BASE_URL_PREFIX = 'f4rsantos.github.io/organizer:ai-base-url:'

function allProviderIds() {
  return listProviders().map(provider => provider.id)
}

function keyStorageKey(providerId) {
  return `${KEY_PREFIX}${providerId}`
}

function baseUrlStorageKey(providerId) {
  return `${BASE_URL_PREFIX}${providerId}`
}

export function loadAiKey(providerId) {
  return readJson(keyStorageKey(providerId), '')
}

export function saveAiKey(providerId, key) {
  return writeJson(keyStorageKey(providerId), key?.trim() ?? '')
}

export function clearAiKey(providerId) {
  try {
    localStorage.removeItem(keyStorageKey(providerId))
  } catch {
    return
  }
}

export function loadBaseUrl(providerId) {
  return readJson(baseUrlStorageKey(providerId), '')
}

export function saveBaseUrl(providerId, url) {
  return writeJson(baseUrlStorageKey(providerId), url?.trim() ?? '')
}

export function clearBaseUrl(providerId) {
  try {
    localStorage.removeItem(baseUrlStorageKey(providerId))
  } catch {
    return
  }
}

export function clearAllAiKeys() {
  for (const providerId of allProviderIds()) {
    clearAiKey(providerId)
    clearBaseUrl(providerId)
  }
}

export function listConfiguredProviders() {
  return allProviderIds().filter(providerId => {
    const key = loadAiKey(providerId)
    const baseUrl = loadBaseUrl(providerId)
    return Boolean(key) || Boolean(baseUrl)
  })
}
