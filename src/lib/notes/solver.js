import { parse, containsVariable } from './expression.js'
import {
  coefficientsOf, subtractCoefficients, degreeOf, formatPolynomial, formatNumber, derivativeOf,
} from './polynomial.js'

const COMPARATORS = ['<=', '>=', '=<', '=>', '<', '>', '=']
const NORMALIZED = { '=<': '<=', '=>': '>=' }
const FLIPPED = { '<': '>', '<=': '>=', '>': '<', '>=': '<=', '=': '=' }
const DERIVATIVE_FORM = /^\s*(?:d\s*\/\s*dx|derivative(?:\s+of)?)\s*\(?\s*(.+?)\s*\)?\s*$/i

function splitOnComparator(source) {
  for (const comparator of COMPARATORS) {
    const at = source.indexOf(comparator)
    if (at === -1) continue
    const left = source.slice(0, at).trim()
    const right = source.slice(at + comparator.length).trim()
    if (!left || !right) return null
    return { left, right, comparator: NORMALIZED[comparator] ?? comparator }
  }
  return null
}

function normalize(text) {
  return text.replace(/\s+/g, '')
}

function polynomialSide(source) {
  const ast = parse(source)
  if (!ast) return null
  return coefficientsOf(ast)
}

function solveLinear(coefficients, comparator, original) {
  const slope = coefficients[1] ?? 0
  const constant = coefficients[0] ?? 0
  if (slope === 0) return null

  const value = -constant / slope
  const direction = slope < 0 ? FLIPPED[comparator] : comparator
  const answer = `x ${direction} ${formatNumber(value)}`
  const steps = []

  const isolated = `${formatPolynomial([0, slope])} ${comparator} ${formatNumber(-constant)}`
  if (constant !== 0 && normalize(isolated) !== normalize(original)) {
    steps.push(isolated)
  }
  const division = `x ${direction} ${formatNumber(-constant)} / ${formatNumber(slope)}`
  if (Math.abs(slope) !== 1 && division !== answer) {
    steps.push(division)
  }
  steps.push(answer)

  return { kind: 'solution', steps, answer }
}

function solveQuadratic(coefficients, comparator) {
  if (comparator !== '=') return null

  const [c = 0, b = 0, a = 0] = coefficients
  const discriminant = b * b - 4 * a * c
  const steps = [`a = ${formatNumber(a)}, b = ${formatNumber(b)}, c = ${formatNumber(c)}`]
  steps.push(`D = b^2 - 4ac = ${formatNumber(discriminant)}`)

  if (discriminant < 0) {
    return { kind: 'solution', steps, answer: 'no real solution' }
  }

  const root = Math.sqrt(discriminant)
  if (discriminant === 0) {
    const only = formatNumber(-b / (2 * a))
    steps.push(`x = -b / 2a = ${only}`)
    return { kind: 'solution', steps, answer: `x = ${only}` }
  }

  const first = formatNumber((-b + root) / (2 * a))
  const second = formatNumber((-b - root) / (2 * a))
  steps.push(`x = (-b ± √D) / 2a`)
  const answer = `x = ${first} or x = ${second}`
  steps.push(answer)
  return { kind: 'solution', steps, answer }
}

export function solveEquation(source) {
  const split = splitOnComparator(source)
  if (!split) return null

  const left = polynomialSide(split.left)
  const right = polynomialSide(split.right)
  if (!left || !right) return null

  const leftAst = parse(split.left)
  const rightAst = parse(split.right)
  if (!containsVariable(leftAst) && !containsVariable(rightAst)) return null

  const combined = subtractCoefficients(left, right)
  const degree = degreeOf(combined)

  const steps = []
  // Only worth showing when it actually rearranges something: for "3x = 3" the
  // normalised form is undone by the very next step.
  if (degreeOf(right) > 0 && degreeOf(combined) > 1) {
    steps.push(`${formatPolynomial(combined)} ${split.comparator} 0`)
  }

  if (degree === 1) {
    const solved = solveLinear(combined, split.comparator, source)
    if (!solved) return null
    return { ...solved, steps: [...steps, ...solved.steps] }
  }

  if (degree === 2) {
    const solved = solveQuadratic(combined, split.comparator)
    if (!solved) return null
    return { ...solved, steps: [...steps, ...solved.steps] }
  }

  return null
}

export function solveDerivative(source) {
  const match = source.match(DERIVATIVE_FORM)
  if (!match) return null

  const inner = match[1].trim()
  const ast = parse(inner)
  if (!ast || !containsVariable(ast)) return null

  const coefficients = coefficientsOf(ast)
  if (!coefficients) return null

  const derived = derivativeOf(coefficients)
  const answer = formatPolynomial(derived)
  return {
    kind: 'solution',
    steps: [`d/dx (${formatPolynomial(coefficients)})`, answer],
    answer,
  }
}
