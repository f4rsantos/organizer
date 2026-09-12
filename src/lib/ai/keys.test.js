import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  loadAiKey,
  saveAiKey,
  clearAiKey,
  loadBaseUrl,
  saveBaseUrl,
  clearAllAiKeys,
  listConfiguredProviders,
} from '@/lib/ai/keys'

function createMemoryStorage() {
  const map = new Map()
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)) },
    removeItem: k => { map.delete(k) },
    clear: () => { map.clear() },
  }
}

describe('keys', () => {
  let originalLocalStorage

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage
    globalThis.localStorage = createMemoryStorage()
  })

  afterEach(() => {
    globalThis.localStorage = originalLocalStorage
  })

  it('round-trips save/load/clear for a provider key', () => {
    expect(loadAiKey('anthropic')).toBe('')
    saveAiKey('anthropic', 'sk-test-123')
    expect(loadAiKey('anthropic')).toBe('sk-test-123')
    clearAiKey('anthropic')
    expect(loadAiKey('anthropic')).toBe('')
  })

  it('round-trips save/load for a base url', () => {
    expect(loadBaseUrl('custom')).toBe('')
    saveBaseUrl('custom', 'http://localhost:11434')
    expect(loadBaseUrl('custom')).toBe('http://localhost:11434')
  })

  it('trims keys and base urls on save', () => {
    saveAiKey('anthropic', '  sk-test-456  ')
    expect(loadAiKey('anthropic')).toBe('sk-test-456')
    saveBaseUrl('custom', '  http://localhost:1234  ')
    expect(loadBaseUrl('custom')).toBe('http://localhost:1234')
  })

  it('clearAllAiKeys leaves nothing behind', () => {
    saveAiKey('anthropic', 'sk-test-123')
    saveBaseUrl('custom', 'http://localhost:11434')
    saveAiKey('custom', 'sk-custom')

    clearAllAiKeys()

    expect(loadAiKey('anthropic')).toBe('')
    expect(loadAiKey('custom')).toBe('')
    expect(loadBaseUrl('custom')).toBe('')
    expect(listConfiguredProviders()).toEqual([])
  })

  it('listConfiguredProviders reports providers with a key or base url', () => {
    expect(listConfiguredProviders()).toEqual([])
    saveAiKey('anthropic', 'sk-test-123')
    expect(listConfiguredProviders()).toEqual(['anthropic'])
    saveBaseUrl('custom', 'http://localhost:11434')
    expect(listConfiguredProviders()).toEqual(['anthropic', 'custom'])
  })

  it('degrades to a fallback instead of throwing when localStorage is unavailable', () => {
    globalThis.localStorage = undefined

    expect(() => loadAiKey('anthropic')).not.toThrow()
    expect(loadAiKey('anthropic')).toBe('')
    expect(() => saveAiKey('anthropic', 'sk-test')).not.toThrow()
    expect(() => clearAiKey('anthropic')).not.toThrow()
    expect(() => clearAllAiKeys()).not.toThrow()
    expect(listConfiguredProviders()).toEqual([])
  })
})
