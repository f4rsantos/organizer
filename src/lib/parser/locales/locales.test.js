import { describe, it, expect } from 'vitest'
import { locales, getLocalePack } from './index.js'
import { en } from './en.js'

const REAL_LANGS = Object.keys(locales).filter(k => k !== 'af' && k !== 'pirate')

const DICT_KEYS = [
  'numbers',
  'ordinals',
  'modifiers',
  'weekdays',
  'months',
  'relativeDates',
  'durations',
  'recurrences',
  'time',
]

const LIST_KEYS = ['weekWords', 'weekOfWords', 'atWords', 'navVerbs', 'timeConnectors']

const WORD_GROUPS = {
  focusWords: ['start', 'stop', 'reset', 'skip', 'break', 'focus', 'minuteUnits', 'hourUnits'],
  gradeWords: ['grade', 'addComponent', 'weight', 'forWords'],
  noteWords: ['note', 'folder', 'addWords'],
  habitWords: ['habit', 'note'],
  priorityWords: ['1', '2', '3'],
  prepositions: ['with', 'for', 'on', 'in', 'to'],
}

const GROUP_LANGS = [...REAL_LANGS, 'af']

const VALID_FREQ = ['daily', 'weekly', 'monthly', 'yearly']

describe('getLocalePack', () => {
  it('returns the requested pack', () => {
    expect(getLocalePack('pt')).toBe(locales.pt)
  })

  it('falls back to English for an unknown code', () => {
    expect(getLocalePack('zz')).toBe(en)
    expect(getLocalePack(undefined)).toBe(en)
  })
})

describe.each(REAL_LANGS)('locale %s', lang => {
  const locale = locales[lang]

  it.each(DICT_KEYS)('defines a non-empty %s dictionary', key => {
    expect(locale[key], `${lang}.${key} missing`).toBeTypeOf('object')
    expect(Object.keys(locale[key] ?? {}).length, `${lang}.${key} is empty`).toBeGreaterThan(0)
  })

  it.each(LIST_KEYS)('defines a non-empty %s list', key => {
    expect(Array.isArray(locale[key]), `${lang}.${key} is not an array`).toBe(true)
    expect(locale[key].length, `${lang}.${key} is empty`).toBeGreaterThan(0)
  })

  it('covers all seven weekdays', () => {
    const values = Object.values(locale.weekdays ?? {})
    expect([...new Set(values)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('covers all twelve months', () => {
    const values = Object.values(locale.months ?? {})
    expect([...new Set(values)].sort((a, b) => a - b)).toEqual([...Array(12).keys()])
  })

  it('covers numbers 1..20 and the tens up to 90', () => {
    const values = new Set(Object.values(locale.numbers ?? {}))
    for (const n of [...Array(20).keys()].map(i => i + 1)) {
      expect(values.has(n), `${lang}.numbers missing ${n}`).toBe(true)
    }
    for (const n of [30, 40, 50, 60, 70, 80, 90]) {
      expect(values.has(n), `${lang}.numbers missing ${n}`).toBe(true)
    }
  })

  it('covers ordinals 1..10', () => {
    const values = new Set(Object.values(locale.ordinals ?? {}))
    for (const n of [...Array(10).keys()].map(i => i + 1)) {
      expect(values.has(n), `${lang}.ordinals missing ${n}`).toBe(true)
    }
  })

  it('uses only known modifier values', () => {
    for (const v of Object.values(locale.modifiers ?? {})) {
      expect(['next', 'this', 'last']).toContain(v)
    }
  })

  it('uses only hour/minute duration values', () => {
    for (const v of Object.values(locale.durations ?? {})) {
      expect(['hour', 'minute']).toContain(v)
    }
  })

  it('declares both an hour and a minute duration word', () => {
    const values = Object.values(locale.durations ?? {})
    expect(values).toContain('hour')
    expect(values).toContain('minute')
  })

  it('uses valid recurrence values', () => {
    for (const [word, v] of Object.entries(locale.recurrences ?? {})) {
      if (v === 'every') continue
      expect(v, `${lang}.recurrences.${word}`).toBeTypeOf('object')
      expect(VALID_FREQ, `${lang}.recurrences.${word}`).toContain(v.freq)
      if (v.interval != null) expect(v.interval).toBeTypeOf('number')
    }
  })

  it('declares an "every" word', () => {
    expect(Object.values(locale.recurrences ?? {})).toContain('every')
  })

  it('declares today and tomorrow with integer offsets', () => {
    const values = Object.values(locale.relativeDates ?? {})
    for (const v of values) expect(Number.isInteger(v)).toBe(true)
    expect(values).toContain(0)
    expect(values).toContain(1)
  })

  it('uses valid time values', () => {
    for (const [word, v] of Object.entries(locale.time ?? {})) {
      const ok = v === 'am' || v === 'pm' || Number.isInteger(v)
      expect(ok, `${lang}.time.${word} = ${v}`).toBe(true)
    }
  })

})

describe.each(GROUP_LANGS)('locale %s keyword groups', lang => {
  const locale = locales[lang]

  it.each(Object.keys(WORD_GROUPS))('declares %s with every required group', key => {
    const groups = locale[key] ?? {}
    for (const group of WORD_GROUPS[key]) {
      expect(Array.isArray(groups[group]), `${lang}.${key}.${group}`).toBe(true)
      expect(groups[group].length, `${lang}.${key}.${group} is empty`).toBeGreaterThan(0)
    }
  })
})

describe.each(Object.keys(locales))('locale %s key casing', lang => {
  const locale = locales[lang]

  it('uses lowercase dictionary keys', () => {
    for (const key of DICT_KEYS) {
      for (const word of Object.keys(locale[key] ?? {})) {
        expect(word, `${lang}.${key}.${word}`).toBe(word.toLowerCase())
      }
    }
  })

  it('uses lowercase word-list entries', () => {
    for (const key of LIST_KEYS) {
      for (const word of locale[key] ?? []) {
        expect(word, `${lang}.${key}: ${word}`).toBe(word.toLowerCase())
      }
    }
  })

  it.each(Object.keys(WORD_GROUPS))('uses lowercase %s entries', key => {
    for (const [group, words] of Object.entries(locale[key] ?? {})) {
      for (const word of words) {
        expect(word, `${lang}.${key}.${group}: ${word}`).toBe(word.toLowerCase())
      }
    }
  })
})
