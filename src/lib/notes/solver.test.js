import { describe, it, expect } from 'vitest'
import { solveEquation, solveDerivative } from './solver.js'
import { polynomialFrom, formatPolynomial, degreeOf } from './polynomial.js'

const answer = source => solveEquation(source)?.answer ?? null

describe('coefficient extraction', () => {
  it('reads a constant', () => {
    expect(polynomialFrom('5')).toEqual([5])
  })

  it('reads a linear term', () => {
    expect(polynomialFrom('3x')).toEqual([0, 3])
  })

  it('reads a linear polynomial', () => {
    expect(polynomialFrom('2x + 4')).toEqual([4, 2])
  })

  it('reads a quadratic', () => {
    expect(polynomialFrom('x^2 - 5x + 6')).toEqual([6, -5, 1])
  })

  it('reads a cubic', () => {
    expect(polynomialFrom('x^3')).toEqual([0, 0, 0, 1])
  })

  it('expands a product', () => {
    expect(polynomialFrom('(x + 1)(x + 2)')).toEqual([2, 3, 1])
  })

  it('refuses a non-polynomial', () => {
    expect(polynomialFrom('sin(x)')).toBe(null)
  })
})

describe('formatting', () => {
  it('formats a quadratic', () => {
    expect(formatPolynomial([6, -5, 1])).toBe('x^2 - 5x + 6')
  })

  it('drops a unit coefficient', () => {
    expect(formatPolynomial([0, 1])).toBe('x')
  })

  it('formats a lone constant', () => {
    expect(formatPolynomial([7])).toBe('7')
  })

  it('reports the degree', () => {
    expect(degreeOf([6, -5, 1])).toBe(2)
  })
})

describe('linear equations', () => {
  it('solves 3x = 3', () => {
    expect(answer('3x = 3')).toBe('x = 1')
  })

  it('solves 2x + 4 = 10', () => {
    expect(answer('2x + 4 = 10')).toBe('x = 3')
  })

  it('solves with terms on both sides', () => {
    expect(answer('3x + 1 = x + 7')).toBe('x = 3')
  })

  it('gives a fractional answer', () => {
    expect(answer('2x = 5')).toBe('x = 2.5')
  })

  it('solves with a negative coefficient', () => {
    expect(answer('-2x = 8')).toBe('x = -4')
  })
})

describe('inequalities', () => {
  it('solves 3x >= 3', () => {
    expect(answer('3x >= 3')).toBe('x >= 1')
  })

  it('flips the sign when dividing by a negative', () => {
    expect(answer('-2x >= 8')).toBe('x <= -4')
  })

  it('accepts the =< spelling', () => {
    expect(answer('2x =< 10')).toBe('x <= 5')
  })
})

describe('quadratic equations', () => {
  it('solves two real roots', () => {
    expect(answer('x^2 - 5x + 6 = 0')).toBe('x = 3 or x = 2')
  })

  it('solves a repeated root', () => {
    expect(answer('x^2 - 4x + 4 = 0')).toBe('x = 2')
  })

  it('reports no real solution', () => {
    expect(answer('x^2 + 1 = 0')).toBe('no real solution')
  })

  it('solves with terms on both sides', () => {
    expect(answer('x^2 = 9')).toBe('x = 3 or x = -3')
  })

  it('shows the discriminant in the steps', () => {
    expect(solveEquation('x^2 - 5x + 6 = 0').steps.some(s => s.includes('D ='))).toBe(true)
  })
})

describe('step by step output', () => {
  it('ends on the answer', () => {
    const solved = solveEquation('2x + 4 = 10')
    expect(solved.steps[solved.steps.length - 1]).toBe(solved.answer)
  })

  it('shows more than one step for a two stage solve', () => {
    expect(solveEquation('2x + 4 = 10').steps.length).toBeGreaterThan(1)
  })

  it('never emits an empty step', () => {
    expect(solveEquation('x^2 - 5x + 6 = 0').steps.every(s => s.trim())).toBe(true)
  })
})

describe('derivatives', () => {
  it('differentiates a power', () => {
    expect(solveDerivative('d/dx(x^3)').answer).toBe('3x^2')
  })

  it('differentiates a polynomial', () => {
    expect(solveDerivative('d/dx(x^3 + 2x)').answer).toBe('3x^2 + 2')
  })

  it('differentiates a constant to zero', () => {
    expect(solveDerivative('d/dx(5 + x)').answer).toBe('1')
  })

  it('accepts the spelled out form', () => {
    expect(solveDerivative('derivative of x^2').answer).toBe('2x')
  })

  it('refuses a non-derivative line', () => {
    expect(solveDerivative('x^2 = 4')).toBe(null)
  })
})

describe('rejects what it cannot solve', () => {
  const rejected = ['2 + 2 = 4', 'x = x', '3x', '= 5', 'read chapter three', '', 'sin(x) = 0']

  rejected.forEach(source => {
    it(`refuses ${JSON.stringify(source)}`, () => {
      expect(solveEquation(source)).toBe(null)
    })
  })
})
