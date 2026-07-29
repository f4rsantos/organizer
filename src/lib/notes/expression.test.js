import { describe, it, expect } from 'vitest'
import { parse, evaluate, containsVariable, solve } from './expression.js'

function value(source) {
  return evaluate(parse(source))
}

describe('arithmetic', () => {
  it('adds', () => {
    expect(value('2 + 3')).toBe(5)
  })

  it('respects multiplication over addition', () => {
    expect(value('2 + 3 * 4')).toBe(14)
  })

  it('respects parentheses', () => {
    expect(value('2 + 3 * (4 - 1)')).toBe(11)
  })

  it('divides', () => {
    expect(value('10 / 4')).toBe(2.5)
  })

  it('takes a modulo', () => {
    expect(value('10 % 3')).toBe(1)
  })

  it('parses decimals', () => {
    expect(value('1.5 + 2.25')).toBe(3.75)
  })
})

describe('exponentiation', () => {
  it('raises to a power', () => {
    expect(value('2 ^ 8')).toBe(256)
  })

  it('is right associative', () => {
    expect(value('2 ^ 3 ^ 2')).toBe(512)
  })

  it('binds tighter than unary minus', () => {
    expect(value('-2 ^ 2')).toBe(-4)
  })
})

describe('unary minus', () => {
  it('negates a leading number', () => {
    expect(value('-5 + 2')).toBe(-3)
  })

  it('negates after an operator', () => {
    expect(value('3 * -2')).toBe(-6)
  })

  it('negates a parenthesised group', () => {
    expect(value('-(2 + 3)')).toBe(-5)
  })

  it('handles a leading plus', () => {
    expect(value('+7')).toBe(7)
  })
})

describe('functions and constants', () => {
  it('evaluates sqrt', () => {
    expect(value('sqrt(16)')).toBe(4)
  })

  it('evaluates a nested call', () => {
    expect(value('abs(-sqrt(9))')).toBe(3)
  })

  it('evaluates a two-argument call', () => {
    expect(value('max(3, 7)')).toBe(7)
  })

  it('evaluates min with an expression argument', () => {
    expect(value('min(2 * 5, 4)')).toBe(4)
  })

  it('resolves pi', () => {
    expect(value('pi')).toBeCloseTo(Math.PI)
  })

  it('evaluates sin of pi over two', () => {
    expect(value('sin(pi / 2)')).toBeCloseTo(1)
  })

  it('uses base-10 for log', () => {
    expect(value('log(1000)')).toBeCloseTo(3)
  })

  it('uses natural base for ln', () => {
    expect(value('ln(e)')).toBeCloseTo(1)
  })
})

describe('implicit multiplication', () => {
  it('multiplies a number by a variable', () => {
    expect(evaluate(parse('3x'), { x: 4 })).toBe(12)
  })

  it('multiplies a number by a parenthesised group', () => {
    expect(value('2(3 + 4)')).toBe(14)
  })

  it('multiplies a variable by a group', () => {
    expect(evaluate(parse('x(x + 1)'), { x: 3 })).toBe(12)
  })

  it('multiplies adjacent groups', () => {
    expect(value('(1 + 1)(2 + 2)')).toBe(8)
  })

  it('multiplies a number by a function call', () => {
    expect(value('2sqrt(9)')).toBe(6)
  })

  it('multiplies a number by a constant', () => {
    expect(value('2pi')).toBeCloseTo(2 * Math.PI)
  })

  it('keeps explicit operators working', () => {
    expect(evaluate(parse('3 * x'), { x: 4 })).toBe(12)
  })

  it('treats two spaced numbers as a product', () => {
    expect(value('2 3')).toBe(6)
  })

  it('binds tighter than addition', () => {
    expect(evaluate(parse('3x + 1'), { x: 2 })).toBe(7)
  })
})

describe('variables', () => {
  it('detects a variable', () => {
    expect(containsVariable(parse('x ^ 2'))).toBe(true)
  })

  it('reports no variable for a constant expression', () => {
    expect(containsVariable(parse('2 + 2'))).toBe(false)
  })

  it('evaluates against a scope', () => {
    expect(evaluate(parse('x ^ 2 + 1'), { x: 3 })).toBe(10)
  })

  it('returns null when the variable is unbound', () => {
    expect(evaluate(parse('x + 1'))).toBe(null)
  })
})

describe('malformed input returns null and never throws', () => {
  const cases = [
    '',
    '   ',
    '2 +',
    '+',
    '* 5',
    '2 + + ',
    '(2 + 3',
    '2 + 3)',
    '()',
    'sqrt',
    'sqrt 9',
    'max(1,)',
    '2 $ 3',
    'hello',
    'foo(2)',
  ]

  cases.forEach(source => {
    it(`rejects ${JSON.stringify(source)}`, () => {
      expect(() => parse(source)).not.toThrow()
      expect(parse(source)).toBe(null)
    })
  })
})

describe('no code execution path', () => {
  const attacks = [
    'constructor',
    'process.exit(1)',
    'globalThis',
    'alert(1)',
    'eval("1")',
    '__proto__',
    'this.constructor.constructor("return 1")()',
    'require("fs")',
    'window.location',
    'toString',
    'hasOwnProperty',
  ]

  attacks.forEach(source => {
    it(`refuses ${JSON.stringify(source)}`, () => {
      expect(parse(source)).toBe(null)
    })
  })

  it('does not resolve inherited object properties as functions', () => {
    expect(parse('valueOf(1)')).toBe(null)
  })
})

describe('non-finite results collapse to null', () => {
  it('rejects division by zero', () => {
    expect(value('1 / 0')).toBe(null)
  })

  it('rejects sqrt of a negative number', () => {
    expect(value('sqrt(-1)')).toBe(null)
  })
})

describe('solve', () => {
  it('formats a whole number without a decimal point', () => {
    expect(solve('2 + 3 * (4 - 1)')).toBe('11')
  })

  it('trims floating point noise', () => {
    expect(solve('0.1 + 0.2')).toBe('0.3')
  })

  it('returns null for an expression containing a variable', () => {
    expect(solve('x + 1')).toBe(null)
  })

  it('returns null for malformed input', () => {
    expect(solve('2 +')).toBe(null)
  })
})
