import { readJson, writeJson } from '@/lib/safeStorage'

const CONSENT_STORAGE_KEY = 'f4rsantos.github.io/organizer:ai-consent'
const PROACTIVE_CONSENT_STORAGE_KEY = 'f4rsantos.github.io/organizer:ai-proactive-consent'
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0']

export function isLocalBaseUrl(baseUrl) {
  if (!baseUrl) return false
  try {
    const hostname = new URL(baseUrl).hostname
    return LOCAL_HOSTNAMES.includes(hostname) || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname === '::1'
  } catch {
    return false
  }
}

export function consentDestinationId(provider, baseUrl) {
  if (provider === 'custom') return `custom:${(baseUrl ?? '').trim().toLowerCase()}`
  return provider
}

export function loadConsentedDestinations() {
  return readJson(CONSENT_STORAGE_KEY, [])
}

export function hasConsentedTo(provider, baseUrl) {
  const destinations = loadConsentedDestinations()
  return destinations.includes(consentDestinationId(provider, baseUrl))
}

export function grantConsent(provider, baseUrl) {
  const destinations = loadConsentedDestinations()
  const id = consentDestinationId(provider, baseUrl)
  if (destinations.includes(id)) return destinations
  const next = [...destinations, id]
  writeJson(CONSENT_STORAGE_KEY, next)
  return next
}

export function clearAllConsent() {
  writeJson(CONSENT_STORAGE_KEY, [])
}

export function hasAcceptedProactiveConsent() {
  return readJson(PROACTIVE_CONSENT_STORAGE_KEY, false) === true
}

export function grantProactiveConsent() {
  writeJson(PROACTIVE_CONSENT_STORAGE_KEY, true)
}

export function clearProactiveConsent() {
  writeJson(PROACTIVE_CONSENT_STORAGE_KEY, false)
}
