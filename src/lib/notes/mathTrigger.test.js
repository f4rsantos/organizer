import { describe, it, expect } from 'vitest'
import { analyzeLine, analyzeSelection, sampleExpression } from './mathTrigger.js'

describe('solves only when the line ends in an equals sign', () => {
  it('solves a trailing-equals line', () => {
    expect(analyzeLine('2 + 3 * 4 =')).toEqual({ kind: 'value', result: '14' })
  })

  it('tolerates trailing whitespace after the equals', () => {
    expect(analyzeLine('7 * 6 =  ')).toEqual({ kind: 'value', result: '42' })
  })

  it('ignores a line with no equals sign', () => {
    expect(analyzeLine('2 + 3 * 4')).toBe(null)
  })

  it('ignores an equals sign that is not final', () => {
    expect(analyzeLine('2 + 2 = 4')).toBe(null)
  })

  it('ignores a bare equals sign', () => {
    expect(analyzeLine('=')).toBe(null)
  })

  it('ignores prose ending in an equals sign', () => {
    expect(analyzeLine('the answer is =')).toBe(null)
  })

  it('ignores an incomplete expression before the equals', () => {
    expect(analyzeLine('2 + =')).toBe(null)
  })

  it('ignores an empty line', () => {
    expect(analyzeLine('')).toBe(null)
  })

  it('ignores a non-string line', () => {
    expect(analyzeLine(null)).toBe(null)
  })
})

describe('graph detection', () => {
  it('returns a graph for an expression containing x', () => {
    expect(analyzeLine('x ^ 2 =')).toEqual({ kind: 'graph', source: 'x ^ 2' })
  })

  it('returns a value when no variable is present', () => {
    expect(analyzeLine('3 ^ 2 =').kind).toBe('value')
  })
})

describe('function form graphs without a trailing equals', () => {
  it('reads y = 3x + 3', () => {
    expect(analyzeLine('y = 3x + 3')).toEqual({ kind: 'graph', source: '3x + 3' })
  })

  it('reads f(x) = x^2', () => {
    expect(analyzeLine('f(x) = x^2')).toEqual({ kind: 'graph', source: 'x^2' })
  })

  it('is case insensitive', () => {
    expect(analyzeLine('Y = 2x').kind).toBe('graph')
  })

  it('ignores a function form with no variable', () => {
    expect(analyzeLine('y = 2 + 2')).toBe(null)
  })

  it('ignores prose that merely contains an equals', () => {
    expect(analyzeLine('my plan = do the reading')).toBe(null)
  })
})

describe('selecting an equation and pressing enter', () => {
  it('graphs a bare expression', () => {
    expect(analyzeSelection('3x + 3')).toEqual({ kind: 'graph', source: '3x + 3' })
  })

  it('graphs a function form', () => {
    expect(analyzeSelection('y = 3x + 3')).toEqual({ kind: 'graph', source: '3x + 3' })
  })

  it('graphs an expression with a trailing equals', () => {
    expect(analyzeSelection('x^2 =')).toEqual({ kind: 'graph', source: 'x^2' })
  })

  it('tolerates surrounding whitespace', () => {
    expect(analyzeSelection('   x^2   ').source).toBe('x^2')
  })

  it('refuses a constant expression', () => {
    expect(analyzeSelection('2 + 2')).toBe(null)
  })

  it('refuses prose', () => {
    expect(analyzeSelection('read chapter three')).toBe(null)
  })

  it('refuses an empty selection', () => {
    expect(analyzeSelection('')).toBe(null)
  })

  it('refuses a non-string', () => {
    expect(analyzeSelection(null)).toBe(null)
  })
})

describe('sampleExpression', () => {
  it('samples the requested number of points', () => {
    expect(sampleExpression('x', { from: 0, to: 10, steps: 10 })).toHaveLength(11)
  })

  it('evaluates the expression at each point', () => {
    const points = sampleExpression('x ^ 2', { from: 0, to: 3, steps: 3 })
    expect(points.map(p => p.y)).toEqual([0, 1, 4, 9])
  })

  it('skips points where the expression is undefined', () => {
    const points = sampleExpression('1 / x', { from: -1, to: 1, steps: 2 })
    expect(points.map(p => p.x)).toEqual([-1, 1])
  })

  it('returns nothing for an expression without a variable', () => {
    expect(sampleExpression('2 + 2')).toEqual([])
  })

  it('returns nothing for malformed input', () => {
    expect(sampleExpression('2 +')).toEqual([])
  })
})
