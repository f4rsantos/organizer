import { describe, it, expect } from 'vitest'
import {
  encodeMnemonic, decodeMnemonic, isValidMnemonic, normalizeMnemonic,
  isWordlistWord, generateRecoveryEntropy,
} from './mnemonic.js'
import { WORDLIST } from './wordlist.js'
import { bytesToHex, randomBytes } from './bytes.js'

describe('wordlist', () => {
  it('holds exactly 2048 words', () => {
    expect(WORDLIST.length).toBe(2048)
  })

  it('holds no duplicates', () => {
    expect(new Set(WORDLIST).size).toBe(2048)
  })

  it('is sorted', () => {
    expect(WORDLIST).toEqual([...WORDLIST].sort())
  })
})

describe('encoding', () => {
  it('produces twelve words', async () => {
    expect((await encodeMnemonic(generateRecoveryEntropy())).split(' ')).toHaveLength(12)
  })

  it('produces only wordlist words', async () => {
    const words = (await encodeMnemonic(generateRecoveryEntropy())).split(' ')
    expect(words.every(isWordlistWord)).toBe(true)
  })

  it('rejects the wrong entropy length', async () => {
    await expect(encodeMnemonic(randomBytes(8))).rejects.toThrow('mnemonic-entropy-invalid')
  })

  it('rejects a non-buffer', async () => {
    await expect(encodeMnemonic('abcd')).rejects.toThrow('mnemonic-entropy-invalid')
  })

  it('encodes all-zero entropy to the canonical phrase', async () => {
    const phrase = await encodeMnemonic(new Uint8Array(16))
    expect(phrase).toBe('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')
  })
})

describe('round trip', () => {
  it('restores the entropy', async () => {
    const entropy = generateRecoveryEntropy()
    const expected = bytesToHex(entropy)
    expect(bytesToHex(await decodeMnemonic(await encodeMnemonic(entropy)))).toBe(expected)
  })

  it('round trips many random seeds', async () => {
    const seeds = Array.from({ length: 50 }, generateRecoveryEntropy)
    const expected = seeds.map(bytesToHex)
    const decoded = await Promise.all(
      seeds.map(async s => bytesToHex(await decodeMnemonic(await encodeMnemonic(s)))),
    )
    expect(decoded).toEqual(expected)
  })
})

describe('checksum', () => {
  it('rejects most single word substitutions', async () => {
    const seeds = 8
    const perSeed = 64
    let accepted = 0

    for (let i = 0; i < seeds; i++) {
      const words = (await encodeMnemonic(generateRecoveryEntropy())).split(' ')
      const results = await Promise.all(
        WORDLIST.slice(0, perSeed).map(word => decodeMnemonic([...words.slice(0, 3), word, ...words.slice(4)].join(' '))),
      )
      accepted += results.filter(Boolean).length
    }

    expect(accepted / (seeds * perSeed)).toBeLessThan(0.15)
  })
})

describe('input tolerance', () => {
  it('accepts mixed case', async () => {
    const phrase = await encodeMnemonic(generateRecoveryEntropy())
    expect(await isValidMnemonic(phrase.toUpperCase())).toBe(true)
  })

  it('accepts collapsed whitespace', async () => {
    const phrase = await encodeMnemonic(generateRecoveryEntropy())
    expect(await isValidMnemonic(`  ${phrase.split(' ').join('   ')}  `)).toBe(true)
  })

  it('accepts newline separated words', async () => {
    const phrase = await encodeMnemonic(generateRecoveryEntropy())
    expect(await isValidMnemonic(phrase.split(' ').join('\n'))).toBe(true)
  })

  it('normalizes to a canonical phrase', () => {
    expect(normalizeMnemonic('  Abandon   ABOUT ')).toBe('abandon about')
  })
})

describe('rejection', () => {
  it('rejects a non-wordlist word', async () => {
    const words = (await encodeMnemonic(generateRecoveryEntropy())).split(' ')
    words[5] = 'zzzznotaword'
    expect(await decodeMnemonic(words.join(' '))).toBe(null)
  })

  it('rejects eleven words', async () => {
    const words = (await encodeMnemonic(generateRecoveryEntropy())).split(' ')
    expect(await decodeMnemonic(words.slice(0, 11).join(' '))).toBe(null)
  })

  it('rejects thirteen words', async () => {
    const words = (await encodeMnemonic(generateRecoveryEntropy())).split(' ')
    expect(await decodeMnemonic([...words, 'zoo'].join(' '))).toBe(null)
  })

  it('rejects an empty phrase', async () => {
    expect(await decodeMnemonic('')).toBe(null)
  })

  it('rejects null', async () => {
    expect(await decodeMnemonic(null)).toBe(null)
  })

  it('reports validity as a boolean', async () => {
    expect(await isValidMnemonic('not a real phrase at all')).toBe(false)
  })
})

describe('entropy', () => {
  it('generates 16 bytes', () => {
    expect(generateRecoveryEntropy().length).toBe(16)
  })

  it('does not repeat', () => {
    expect(bytesToHex(generateRecoveryEntropy())).not.toBe(bytesToHex(generateRecoveryEntropy()))
  })
})
