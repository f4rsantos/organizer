import { describe, it, expect } from 'vitest'
import { parseGradeInput, isPartialDecimal, gradedFraction, subcomponentWeights, setSubcomponentShare, roundedPercents, weightedAverage } from '../../src/lib/gradeUtils'

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

describe('subcomponentWeights', () => {
  it('splits the parent weight equally when no share was set', () => {
    const weights = subcomponentWeights({ weight: 0.6, subcomponents: [{}, {}, {}] })
    weights.forEach(w => expect(w).toBeCloseTo(0.2))
  })

  it('gives unset parts what custom parts leave over', () => {
    const weights = subcomponentWeights({ weight: 0.5, subcomponents: [{ share: 0.6 }, {}, {}] })
    expect(weights[0]).toBeCloseTo(0.3)
    expect(weights[1]).toBeCloseTo(0.1)
    expect(weights[2]).toBeCloseTo(0.1)
  })

  it('rescales custom parts to fill the parent after one is removed', () => {
    const weights = subcomponentWeights({ weight: 0.4, subcomponents: [{ share: 0.2 }, { share: 0.6 }] })
    expect(weights[0]).toBeCloseTo(0.1)
    expect(weights[1]).toBeCloseTo(0.3)
  })
})

describe('setSubcomponentShare', () => {
  const subs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const sharesOf = result => result.subcomponents.map(s => s.share)
  const sum = values => values.reduce((total, v) => total + v, 0)

  it('keeps the parts summing to the whole component', () => {
    expect(sharesOf(setSubcomponentShare(subs, 'a', 0.5))).toEqual([0.5, 0.25, 0.25])
  })

  it('redistributes the rest in proportion to the other parts', () => {
    const { subcomponents } = setSubcomponentShare([{ id: 'a', share: 0.2 }, { id: 'b', share: 0.2 }, { id: 'c', share: 0.6 }], 'a', 0.6)
    expect(subcomponents[1].share).toBeCloseTo(0.1)
    expect(subcomponents[2].share).toBeCloseTo(0.3)
  })

  it('clamps a share above the whole component', () => {
    expect(sharesOf(setSubcomponentShare(subs, 'b', 1.7))).toEqual([0, 1, 0])
  })

  it('splits the rest equally when the other parts were at zero', () => {
    const { subcomponents } = setSubcomponentShare([{ id: 'a', share: 1 }, { id: 'b', share: 0 }, { id: 'c', share: 0 }], 'a', 0.4)
    expect(subcomponents[1].share).toBeCloseTo(0.3)
    expect(subcomponents[2].share).toBeCloseTo(0.3)
  })

  it('feeds the custom split into the weighted average', () => {
    const { subcomponents } = setSubcomponentShare([{ id: 'a', grade: 20 }, { id: 'b', grade: 10 }], 'a', 0.8)
    expect(weightedAverage([{ weight: 1, subcomponents }])).toBe(18)
  })

  it('leaves a part edited earlier untouched when another part is edited', () => {
    const first = setSubcomponentShare(subs, 'a', 0.5)
    const second = setSubcomponentShare(first.subcomponents, 'b', 0.1, first.lockedIds)
    expect(second.subcomponents[0].share).toBe(0.5)
    expect(second.subcomponents[1].share).toBe(0.1)
    expect(second.subcomponents[2].share).toBeCloseTo(0.4)
  })

  it('caps an edit at what the earlier edited parts leave over', () => {
    const first = setSubcomponentShare(subs, 'a', 0.7)
    const second = setSubcomponentShare(first.subcomponents, 'b', 0.9, first.lockedIds)
    expect(second.subcomponents[0].share).toBe(0.7)
    expect(second.subcomponents[1].share).toBeCloseTo(0.3)
    expect(second.subcomponents[2].share).toBeCloseTo(0)
  })

  it('releases the oldest edited part when no other part is free to absorb the change', () => {
    const first = setSubcomponentShare(subs, 'a', 0.5)
    const second = setSubcomponentShare(first.subcomponents, 'b', 0.3, first.lockedIds)
    const third = setSubcomponentShare(second.subcomponents, 'c', 0.4, second.lockedIds)
    expect(sharesOf(third)[1]).toBe(0.3)
    expect(sharesOf(third)[2]).toBe(0.4)
    expect(sharesOf(third)[0]).toBeCloseTo(0.3)
    expect(third.lockedIds).toEqual(['b', 'c'])
  })

  it('keeps the total at the whole component across a chain of edits', () => {
    let state = { subcomponents: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }], lockedIds: [] }
    for (const [id, share] of [['a', 0.6], ['b', 0.5], ['c', 0.05], ['d', 0.9], ['a', 0.1]]) {
      state = setSubcomponentShare(state.subcomponents, id, share, state.lockedIds)
      expect(sum(sharesOf(state))).toBeCloseTo(1)
    }
  })

  it('ignores pins for parts that no longer exist', () => {
    const { subcomponents } = setSubcomponentShare([{ id: 'a' }, { id: 'b' }], 'a', 0.25, ['gone'])
    expect(subcomponents[1].share).toBeCloseTo(0.75)
  })
})

describe('roundedPercents', () => {
  it('rounds to one decimal while still adding up to the component percentage', () => {
    const percents = roundedPercents([0.1, 0.1, 0.1], 0.3)
    expect(percents.reduce((total, p) => total + p, 0)).toBeCloseTo(30)
    expect([...percents].sort()).toEqual([10, 10, 10])
  })

  it('gives the leftover tenth to the part with the largest remainder', () => {
    expect(roundedPercents([1 / 3, 1 / 3, 1 / 3], 1)).toEqual([33.4, 33.3, 33.3])
  })
})
