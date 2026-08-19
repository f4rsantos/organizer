import { describe, it, expect, beforeEach, vi } from 'vitest'

function memoryStorage() {
  const map = new Map()
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    clear: () => map.clear(),
  }
}

describe('dek id persistence', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('localStorage', memoryStorage())
  })

  it('round-trips the dek id', async () => {
    const { saveDekId, loadDekId } = await import('./crypto/keyState.js')
    saveDekId('abc123')
    expect(loadDekId()).toBe('abc123')
  })

  it('ignores an empty dek id rather than storing a blank', async () => {
    const { saveDekId, loadDekId } = await import('./crypto/keyState.js')
    saveDekId(null)
    expect(loadDekId()).toBeNull()
  })

  it('forgets the dek id when encryption is disabled', async () => {
    const { saveDekId, clearDekId, loadDekId } = await import('./crypto/keyState.js')
    saveDekId('abc123')
    clearDekId()
    expect(loadDekId()).toBeNull()
  })
})
