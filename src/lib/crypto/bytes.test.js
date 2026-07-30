import { describe, it, expect } from 'vitest'
import {
  toBase64, fromBase64, toBase64Url, fromBase64Url,
  bytesToHex, hexToBytes, randomBytes, constantTimeEqualHex, zeroFill,
} from './bytes.js'

const SAMPLE = new Uint8Array([0, 1, 62, 63, 127, 128, 254, 255])

describe('base64', () => {
  it('round trips arbitrary bytes', () => {
    expect(Array.from(fromBase64(toBase64(SAMPLE)))).toEqual(Array.from(SAMPLE))
  })

  it('round trips an empty array', () => {
    expect(fromBase64(toBase64(new Uint8Array(0))).length).toBe(0)
  })
})

describe('base64url', () => {
  it('round trips arbitrary bytes', () => {
    expect(Array.from(fromBase64Url(toBase64Url(SAMPLE)))).toEqual(Array.from(SAMPLE))
  })

  it('emits no characters that need url escaping', () => {
    for (let i = 0; i < 50; i++) {
      const encoded = toBase64Url(randomBytes(32))
      expect(encoded).toBe(encodeURIComponent(encoded))
    }
  })

  it('round trips every unpadded length', () => {
    for (const length of [1, 2, 3, 4, 15, 16, 17, 32]) {
      const bytes = randomBytes(length)
      expect(Array.from(fromBase64Url(toBase64Url(bytes)))).toEqual(Array.from(bytes))
    }
  })
})

describe('hex', () => {
  it('round trips arbitrary bytes', () => {
    expect(Array.from(hexToBytes(bytesToHex(SAMPLE)))).toEqual(Array.from(SAMPLE))
  })

  it('pads single digit bytes', () => {
    expect(bytesToHex(new Uint8Array([1, 15]))).toBe('010f')
  })

  it('rejects an odd length string', () => {
    expect(() => hexToBytes('abc')).toThrow('invalid-hex')
  })
})

describe('randomBytes', () => {
  it('returns the requested length', () => {
    expect(randomBytes(16).length).toBe(16)
  })

  it('does not repeat', () => {
    expect(bytesToHex(randomBytes(32))).not.toBe(bytesToHex(randomBytes(32)))
  })
})

describe('constantTimeEqualHex', () => {
  it('matches identical values', () => {
    expect(constantTimeEqualHex('abcd', 'abcd')).toBe(true)
  })

  it('rejects a differing value', () => {
    expect(constantTimeEqualHex('abcd', 'abce')).toBe(false)
  })

  it('rejects a differing length', () => {
    expect(constantTimeEqualHex('abcd', 'abcdef')).toBe(false)
  })

  it('rejects null', () => {
    expect(constantTimeEqualHex(null, 'abcd')).toBe(false)
  })
})

describe('zeroFill', () => {
  it('clears the buffer', () => {
    const bytes = randomBytes(8)
    zeroFill(bytes)
    expect(Array.from(bytes)).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  })

  it('ignores a non-buffer', () => {
    expect(() => zeroFill(null)).not.toThrow()
  })
})
