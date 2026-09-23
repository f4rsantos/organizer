import { describe, it, expect } from 'vitest'
import { SYNC_SHAPES } from '../../../src/lib/sync/fingerprint.js'
import { DATA_SLICES, META_KEYS } from '../../../src/lib/crypto/sliceCodec.js'

const MERGED_BY_IMPORT_RULES = ['version', 'settings', 'collab', 'presetUpdatedAt', 'scheduleImports']

describe('SYNC_SHAPES coverage', () => {
  it('gives every synced key an explicit merge rule', () => {
    const synced = [...META_KEYS, ...DATA_SLICES]
    const undecided = synced.filter(key => !SYNC_SHAPES[key] && !MERGED_BY_IMPORT_RULES.includes(key))
    expect(undecided).toEqual([])
  })

  it('only describes keys that actually sync', () => {
    const synced = new Set([...META_KEYS, ...DATA_SLICES])
    expect(Object.keys(SYNC_SHAPES).filter(key => !synced.has(key))).toEqual([])
  })
})
