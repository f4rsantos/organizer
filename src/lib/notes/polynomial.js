import { parse, evaluate } from './expression.js'

const MAX_DEGREE = 4
const EPSILON = 1e-9

function clean(value) {
  const rounded = Math.round(value * 1e10) / 1e10
  return Object.is(rounded, -0) ? 0 : rounded
}

// Lagrange-style sampling: a polynomial of degree n is fixed by n+1 points, so
// evaluating at 0..n and solving the differences recovers its coefficients
// without needing a symbolic expander.
export function coefficientsOf(ast, maxDegree = MAX_DEGREE) {
  const samples = []
  for (let i = 0; i <= maxDegree; i++) {
    const y = evaluate(ast, { x: i })
    if (y === null) return null
    samples.push(y)
  }

  let differences = samples
  const leading = []
  for (let order = 0; order <= maxDegree; order++) {
    leading.push(differences[0])
    differences = differences.slice(1).map((value, i) => value - differences[i])
  }

  const coefficients = new Array(maxDegree + 1).fill(0)
  let factorial = 1
  for (let order = 0; order <= maxDegree; order++) {
    if (order > 0) factorial *= order
    const term = leading[order] / factorial
    for (const [power, weight] of stirlingRow(order)) {
      coefficients[power] += term * weight
    }
  }

  const result = coefficients.map(clean)
  while (result.length > 1 && result[result.length - 1] === 0) result.pop()

  for (const value of result) {
    if (!Number.isFinite(value)) return null
  }

  const degree = result.length - 1
  const verifyAt = degree + 2
  const expected = evaluate(ast, { x: verifyAt })
  if (expected === null) return null
  const actual = result.reduce((sum, c, power) => sum + c * verifyAt ** power, 0)
  if (Math.abs(expected - actual) > 1e-6) return null

  return result
}

const STIRLING_CACHE = new Map()

function stirlingRow(order) {
  if (STIRLING_CACHE.has(order)) return STIRLING_CACHE.get(order)

  let poly = [1]
  for (let k = 0; k < order; k++) {
    const next = new Array(poly.length + 1).fill(0)
    for (let power = 0; power < poly.length; power++) {
      next[power + 1] += poly[power]
      next[power] -= poly[power] * k
    }
    poly = next
  }

  const row = poly.map((weight, power) => [power, weight]).filter(([, weight]) => weight !== 0)
  STIRLING_CACHE.set(order, row)
  return row
}

export function subtractCoefficients(left, right) {
  const length = Math.max(left.length, right.length)
  const result = []
  for (let i = 0; i < length; i++) result.push(clean((left[i] ?? 0) - (right[i] ?? 0)))
  while (result.length > 1 && result[result.length - 1] === 0) result.pop()
  return result
}

export function degreeOf(coefficients) {
  for (let power = coefficients.length - 1; power >= 0; power--) {
    if (Math.abs(coefficients[power]) > EPSILON) return power
  }
  return 0
}

export function polynomialFrom(source) {
  const ast = parse(source)
  if (!ast) return null
  return coefficientsOf(ast)
}

export function formatNumber(value) {
  const rounded = clean(value)
  if (Number.isInteger(rounded)) return String(rounded)
  return String(Math.round(rounded * 1e6) / 1e6)
}

export function formatPolynomial(coefficients) {
  const degree = degreeOf(coefficients)
  if (degree === 0) return formatNumber(coefficients[0] ?? 0)

  const parts = []
  for (let power = degree; power >= 0; power--) {
    const value = clean(coefficients[power] ?? 0)
    if (value === 0) continue

    const magnitude = Math.abs(value)
    const sign = value < 0 ? '-' : '+'
    const shown = magnitude === 1 && power > 0 ? '' : formatNumber(magnitude)
    const variable = power === 0 ? '' : power === 1 ? 'x' : `x^${power}`

    parts.push(parts.length === 0
      ? `${value < 0 ? '-' : ''}${shown}${variable}`
      : ` ${sign} ${shown}${variable}`)
  }

  return parts.join('') || '0'
}

export function derivativeOf(coefficients) {
  if (coefficients.length <= 1) return [0]
  return coefficients.slice(1).map((value, i) => clean(value * (i + 1)))
}
