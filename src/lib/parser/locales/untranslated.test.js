import { describe, it, expect } from 'vitest'
import { locales } from './index.js'
import { en as enStrings } from '../../strings/en.js'
import { STRINGS } from '../../strings/index.js'

const PLACEHOLDER = 'banana'

function collectPlaceholders(source, label) {
  const found = []
  for (const [lang, pack] of Object.entries(source)) {
    for (const [key, value] of Object.entries(pack ?? {})) {
      if (Array.isArray(value)) {
        if (value.includes(PLACEHOLDER)) found.push(`${label}/${lang}.${key}`)
        continue
      }
      if (value && typeof value === 'object') {
        for (const [group, words] of Object.entries(value)) {
          if (Array.isArray(words) && words.includes(PLACEHOLDER)) {
            found.push(`${label}/${lang}.${key}.${group}`)
          }
        }
      }
    }
  }
  return found.sort()
}

describe('untranslated keyword placeholders', () => {
  it('reports every group still awaiting a human translator', () => {
    const pending = [
      ...collectPlaceholders(locales, 'parser'),
      ...collectPlaceholders(STRINGS, 'strings'),
    ]

    if (pending.length > 0) {
      console.warn(
        `${pending.length} keyword group(s) awaiting translation:\n  ${pending.join('\n  ')}`
      )
    }

    expect(Array.isArray(pending)).toBe(true)
  })

  it('never ships a placeholder in the English packs', () => {
    expect(collectPlaceholders({ en: locales.en }, 'parser')).toEqual([])
    expect(collectPlaceholders({ en: enStrings }, 'strings')).toEqual([])
  })
})
