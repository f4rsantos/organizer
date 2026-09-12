import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  isLocalBaseUrl, consentDestinationId, loadConsentedDestinations,
  hasConsentedTo, grantConsent, clearAllConsent,
} from './aiConsent'

function createMemoryStorage() {
  const map = new Map()
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)) },
    removeItem: k => { map.delete(k) },
    clear: () => { map.clear() },
  }
}

let originalLocalStorage

beforeEach(() => {
  originalLocalStorage = globalThis.localStorage
  globalThis.localStorage = createMemoryStorage()
})

afterEach(() => {
  globalThis.localStorage = originalLocalStorage
})

describe('isLocalBaseUrl', () => {
  it('detects localhost', () => {
    expect(isLocalBaseUrl('http://localhost:11434')).toBe(true)
  })

  it('detects LAN addresses', () => {
    expect(isLocalBaseUrl('http://192.168.1.50:11434')).toBe(true)
  })

  it('rejects public hosts', () => {
    expect(isLocalBaseUrl('https://api.anthropic.com')).toBe(false)
  })

  it('handles empty input', () => {
    expect(isLocalBaseUrl('')).toBe(false)
    expect(isLocalBaseUrl(null)).toBe(false)
  })

  it('handles malformed urls', () => {
    expect(isLocalBaseUrl('not a url')).toBe(false)
  })
})

describe('consentDestinationId', () => {
  it('uses provider id directly for hosted providers', () => {
    expect(consentDestinationId('anthropic', undefined)).toBe('anthropic')
  })

  it('includes the base url for custom providers', () => {
    expect(consentDestinationId('custom', 'http://localhost:11434')).toBe('custom:http://localhost:11434')
  })
})

describe('consent storage', () => {
  it('starts empty', () => {
    expect(loadConsentedDestinations()).toEqual([])
    expect(hasConsentedTo('anthropic')).toBe(false)
  })

  it('grants and persists consent per destination', () => {
    grantConsent('anthropic', undefined)
    expect(hasConsentedTo('anthropic')).toBe(true)
    expect(hasConsentedTo('custom', 'http://localhost:11434')).toBe(false)
  })

  it('does not duplicate an already-granted destination', () => {
    grantConsent('anthropic', undefined)
    grantConsent('anthropic', undefined)
    expect(loadConsentedDestinations()).toEqual(['anthropic'])
  })

  it('treats different custom base urls as different destinations', () => {
    grantConsent('custom', 'http://localhost:11434')
    expect(hasConsentedTo('custom', 'http://localhost:11434')).toBe(true)
    expect(hasConsentedTo('custom', 'http://192.168.1.50:11434')).toBe(false)
  })

  it('clears all consent', () => {
    grantConsent('anthropic', undefined)
    clearAllConsent()
    expect(loadConsentedDestinations()).toEqual([])
  })
})
