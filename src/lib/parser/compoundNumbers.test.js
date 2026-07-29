import { describe, it, expect } from 'vitest'
import { parseCompoundNumber } from './compoundNumbers.js'
import { af } from './locales/af.js'
import { de } from './locales/de.js'
import { en } from './locales/en.js'

const afValue = word => parseCompoundNumber(word, af.numbers, af.compoundJoiners)
const deValue = word => parseCompoundNumber(word, de.numbers, de.compoundJoiners)

describe('Afrikaans inverted compounds', () => {
  const cases = [
    ['eenentwintig', 21],
    ['tweeentwintig', 22],
    ['drieentwintig', 23],
    ['vierentwintig', 24],
    ['vyfentwintig', 25],
    ['sesentwintig', 26],
    ['seweentwintig', 27],
    ['agtentwintig', 28],
    ['negeentwintig', 29],
    ['eenendertig', 31],
    ['vyfenveertig', 45],
    ['sesenvyftig', 56],
    ['seweensestig', 67],
    ['agtensewentig', 78],
    ['negeentagtig', 89],
    ['negeennegentig', 99],
  ]

  cases.forEach(([word, expected]) => {
    it(`${word} is ${expected}`, () => {
      expect(afValue(word)).toBe(expected)
    })
  })
})

describe('spelling variants', () => {
  it('accepts the hyphenated form', () => {
    expect(afValue('een-en-twintig')).toBe(21)
  })

  it('accepts the spaced form', () => {
    expect(afValue('een en twintig')).toBe(21)
  })

  it('is case insensitive', () => {
    expect(afValue('EenEnTwintig')).toBe(21)
  })
})

describe('plain numbers are left to the dictionary', () => {
  const plain = ['een', 'tien', 'elf', 'twaalf', 'negentien', 'twintig', 'dertig', 'negentig']

  plain.forEach(word => {
    it(`${word} is not treated as a compound`, () => {
      expect(afValue(word)).toBe(null)
    })
  })
})

describe('non-numbers are rejected', () => {
  const rejected = ['', 'entwintig', 'eenen', 'banana', 'eenenbanana', 'bananaentwintig', 'twintigeneen']

  rejected.forEach(word => {
    it(`${JSON.stringify(word)} returns null`, () => {
      expect(afValue(word)).toBe(null)
    })
  })

  it('rejects a non-string', () => {
    expect(afValue(null)).toBe(null)
  })

  it('rejects a tens-and-tens pairing', () => {
    expect(afValue('twintigendertig')).toBe(null)
  })
})

describe('German shares the pattern', () => {
  it('resolves einundzwanzig', () => {
    expect(deValue('einundzwanzig')).toBe(21)
  })

  it('resolves dreiunddreissig', () => {
    expect(deValue('dreiunddreissig')).toBe(33)
  })

  it('resolves neunundneunzig', () => {
    expect(deValue('neunundneunzig')).toBe(99)
  })

  it('leaves plain zwanzig alone', () => {
    expect(deValue('zwanzig')).toBe(null)
  })
})

describe('locales without joiners opt out', () => {
  it('English is untouched', () => {
    expect(parseCompoundNumber('twentyone', en.numbers, en.compoundJoiners)).toBe(null)
  })

  it('a missing joiner list returns null', () => {
    expect(parseCompoundNumber('eenentwintig', af.numbers, undefined)).toBe(null)
  })
})
