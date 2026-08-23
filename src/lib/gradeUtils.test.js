import { describe, it, expect } from 'vitest'
import { parseGradeInput, isPartialDecimal } from './gradeUtils'

describe('parseGradeInput', () => {
  it('parses dot decimals', () => {
    expect(parseGradeInput('12.5')).toBe(12.5)
  })

  it('parses comma decimals', () => {
    expect(parseGradeInput('12,5')).toBe(12.5)
  })

  it('trims whitespace', () => {
    expect(parseGradeInput('  12,5  ')).toBe(12.5)
  })

  it('returns null for empty input', () => {
    expect(parseGradeInput('')).toBeNull()
    expect(parseGradeInput('   ')).toBeNull()
    expect(parseGradeInput(null)).toBeNull()
    expect(parseGradeInput(undefined)).toBeNull()
  })

  it('returns null for garbage', () => {
    expect(parseGradeInput('abc')).toBeNull()
    expect(parseGradeInput('.')).toBeNull()
    expect(parseGradeInput(',')).toBeNull()
    expect(parseGradeInput('-')).toBeNull()
  })

  it('clamps below the minimum', () => {
    expect(parseGradeInput('-3', { min: 0, max: 20 })).toBe(0)
  })

  it('clamps above the scale', () => {
    expect(parseGradeInput('25', { min: 0, max: 20 })).toBe(20)
    expect(parseGradeInput('25,5', { min: 0, max: 20 })).toBe(20)
  })

  it('leaves in-range values untouched', () => {
    expect(parseGradeInput('12,5', { min: 0, max: 20 })).toBe(12.5)
  })

  it('handles trailing separators as whole numbers', () => {
    expect(parseGradeInput('1.')).toBe(1)
    expect(parseGradeInput('1,')).toBe(1)
  })

  it('accepts numeric input', () => {
    expect(parseGradeInput(14)).toBe(14)
  })
})

describe('isPartialDecimal', () => {
  it('allows intermediate typing states', () => {
    for (const s of ['', '1', '1.', '1,', '1.5', '1,5', '-', '-1,5', '.5', ',5']) {
      expect(isPartialDecimal(s), s).toBe(true)
    }
  })

  it('rejects letters and duplicate separators', () => {
    for (const s of ['a', '1a', '1.5.5', '1,5,5', '1.5,5', '1 5']) {
      expect(isPartialDecimal(s), s).toBe(false)
    }
  })
})
