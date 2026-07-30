import { describe, it, expect } from 'vitest'
import { GUIDE_STRINGS, GUIDE_SECTIONS } from './index'

const { en } = GUIDE_STRINGS
const ENTRY_IDS = Object.keys(en.entries)
const LOCALES = Object.entries(GUIDE_STRINGS).filter(([name]) => name !== 'en')

describe('guide sections', () => {
  it('list every entry exactly once', () => {
    const listed = GUIDE_SECTIONS.flatMap(s => s.entries)
    expect([...listed].sort()).toEqual([...ENTRY_IDS].sort())
  })

  it('name a section string for every section', () => {
    const missing = GUIDE_SECTIONS.filter(s => !en.sections[s.id])
    expect(missing).toEqual([])
  })
})

describe('every locale matches the English guide structure', () => {
  LOCALES.forEach(([name, strings]) => {
    it(`${name} defines every entry with the same shape`, () => {
      const broken = ENTRY_IDS.filter(id => {
        const entry = strings.entries?.[id]
        return !entry || !entry.title || !entry.summary || !Array.isArray(entry.body)
      })
      expect(broken).toEqual([])
    })

    it(`${name} keeps the English paragraph count`, () => {
      const mismatched = ENTRY_IDS.filter(id =>
        strings.entries[id].body.length !== en.entries[id].body.length)
      expect(mismatched).toEqual([])
    })

    it(`${name} has no orphan entries`, () => {
      const orphans = Object.keys(strings.entries ?? {}).filter(id => !ENTRY_IDS.includes(id))
      expect(orphans).toEqual([])
    })

    it(`${name} translates every section label`, () => {
      const missing = Object.keys(en.sections).filter(s => !strings.sections?.[s])
      expect(missing).toEqual([])
    })
  })
})
