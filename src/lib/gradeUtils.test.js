import { describe, it, expect } from 'vitest'
import { parseGradeInput, isPartialDecimal, gradedFraction } from './gradeUtils'

describe('gradedFraction', () => {
  it('is zero with no components', () => {
    expect(gradedFraction([])).toBe(0)
  })

  it('is zero when nothing is graded', () => {
    expect(gradedFraction([{ weight: 0.5 }, { weight: 0.5 }])).toBe(0)
  })

  it('counts graded weight against total weight', () => {
    expect(gradedFraction([{ weight: 0.4, grade: 15 }, { weight: 0.6 }])).toBeCloseTo(0.4)
  })

  it('measures against the weight that exists, not against 1', () => {
    expect(gradedFraction([{ weight: 0.3, grade: 12 }, { weight: 0.2 }])).toBeCloseTo(0.6)
  })

  it('splits weight across subcomponents', () => {
    const components = [{
      weight: 1,
      subcomponents: [{ grade: 10 }, { grade: 14 }, {}, {}],
    }]
    expect(gradedFraction(components)).toBeCloseTo(0.5)
  })

  it('treats empty-string grades as ungraded', () => {
    expect(gradedFraction([{ weight: 1, grade: '' }])).toBe(0)
  })

  it('never exceeds 1 and never returns NaN', () => {
    expect(gradedFraction([{ weight: 0 }])).toBe(0)
    expect(gradedFraction([{ grade: 12 }])).toBe(0)
    expect(gradedFraction([{ weight: 2, grade: 12 }])).toBe(1)
  })
})

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
