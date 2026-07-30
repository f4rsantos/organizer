import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { locales } from './index.js'
import { en } from './en.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const PARSER_ROOT = join(HERE, '..')

const LOCALE_READ_RE = /locale\??\.\??([A-Za-z][A-Za-z0-9_]*)/g

const NOT_A_KEYWORD_KEY = new Set(['length', 'toLowerCase'])

const OPT_IN_ONLY_KEYS = new Set(['compoundJoiners'])

function sourceFiles() {
  const files = [join(PARSER_ROOT, 'quickActionParse.js')]
  const parsersDir = join(PARSER_ROOT, 'parsers')
  for (const name of readdirSync(parsersDir)) {
    if (name.endsWith('.js') && !name.endsWith('.test.js')) files.push(join(parsersDir, name))
  }
  return files
}

function keysReadFromLocale() {
  const found = new Map()
  for (const file of sourceFiles()) {
    const src = readFileSync(file, 'utf8')
    for (const m of src.matchAll(LOCALE_READ_RE)) {
      if (NOT_A_KEYWORD_KEY.has(m[1]) || OPT_IN_ONLY_KEYS.has(m[1])) continue
      if (!found.has(m[1])) found.set(m[1], [])
      found.get(m[1]).push(file.slice(PARSER_ROOT.length + 1))
    }
  }
  return found
}

describe('locale key coverage', () => {
  it('every locale key a parser reads is defined in the English pack', () => {
    const missing = [...keysReadFromLocale().entries()]
      .filter(([key]) => !(key in en))
      .map(([key, files]) => `${key} (read in ${[...new Set(files)].join(', ')})`)

    expect(missing).toEqual([])
  })

  it('every locale key a parser reads is defined in every pack', () => {
    const keys = [...keysReadFromLocale().keys()].filter(key => key in en)
    const gaps = []

    for (const [lang, pack] of Object.entries(locales)) {
      if (lang === 'en') continue
      for (const key of keys) {
        if (!(key in pack)) gaps.push(`${lang}.${key}`)
      }
    }

    expect(gaps.sort()).toEqual([])
  })

  it('keeps the opt-in keys out of the English pack', () => {
    for (const key of OPT_IN_ONLY_KEYS) {
      expect(en[key], `en.${key} must stay undefined`).toBeUndefined()
    }
  })
})
