import { describe, it, expect } from 'vitest'
import { suggestSemesterName, semesterDraftStatus, semesterFromDraft } from '../../../src/lib/onboarding/semesterDraft.js'

describe('semester name suggestion', () => {
  it('names an autumn start as the first semester of the academic year', () => {
    expect(suggestSemesterName('2026-09-14')).toBe('2026/27 S1')
  })

  it('names a spring start as the second semester of the academic year that began last year', () => {
    expect(suggestSemesterName('2027-02-15')).toBe('2026/27 S2')
  })

  it('suggests nothing without a valid start date', () => {
    expect(suggestSemesterName('')).toBe('')
  })
})

describe('semester draft status', () => {
  it('waits for both dates before the semester can be saved', () => {
    expect(semesterDraftStatus({ startDate: '2026-09-14', endDate: '' })).toBe('incomplete')
  })

  it('rejects an end date on or before the start date', () => {
    expect(semesterDraftStatus({ startDate: '2026-09-14', endDate: '2026-09-14' })).toBe('endBeforeStart')
  })

  it('accepts an end date after the start date', () => {
    expect(semesterDraftStatus({ startDate: '2026-09-14', endDate: '2027-01-29' })).toBe('ready')
  })
})

describe('semester from draft', () => {
  it('fills in the suggested name when the user left it blank', () => {
    expect(semesterFromDraft({ name: '  ', startDate: '2026-09-14', endDate: '2027-01-29' }))
      .toEqual({ name: '2026/27 S1', startDate: '2026-09-14', endDate: '2027-01-29' })
  })

  it('keeps a name the user typed', () => {
    expect(semesterFromDraft({ name: 'Erasmus', startDate: '2026-09-14', endDate: '2027-01-29' }).name).toBe('Erasmus')
  })
})
