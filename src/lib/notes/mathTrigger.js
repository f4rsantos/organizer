import { parse, containsVariable, evaluate, formatResult } from './expression.js'
import { solveEquation, solveDerivative } from './solver.js'

const TRAILING_EQUALS = /^(.*?)=\s*$/
const FUNCTION_FORM = /^\s*(?:y|f\s*\(\s*x\s*\))\s*=\s*(.+)$/i

// "y = 3x + 3" is a graph request even without a trailing "=".
export function analyzeFunctionForm(line) {
  if (typeof line !== 'string') return null
  const match = line.match(FUNCTION_FORM)
  if (!match) return null

  const source = match[1].trim()
  const ast = parse(source)
  if (!ast || !containsVariable(ast)) return null
  return { kind: 'graph', source }
}

// A selected equation graphs on Enter, with or without "y =" or a trailing "=".
export function analyzeSelection(text) {
  if (typeof text !== 'string') return null

  const trimmed = text.trim()
  if (!trimmed) return null

  const functionForm = analyzeFunctionForm(trimmed)
  if (functionForm) return functionForm

  const source = trimmed.replace(/=\s*$/, '').trim()
  if (!source) return null

  const ast = parse(source)
  if (!ast || !containsVariable(ast)) return null
  return { kind: 'graph', source }
}

export function analyzeLine(line, { solveEquations = true } = {}) {
  if (typeof line !== 'string') return null

  const functionForm = analyzeFunctionForm(line)
  if (functionForm) return functionForm

  if (solveEquations) {
    const derived = solveDerivative(line)
    if (derived) return derived

    const solved = solveEquation(line)
    if (solved) return solved
  }

  const match = line.match(TRAILING_EQUALS)
  if (!match) return null

  const source = match[1]
  if (!source.trim()) return null

  const ast = parse(source)
  if (!ast) return null

  if (containsVariable(ast)) return { kind: 'graph', source: source.trim() }

  const result = formatResult(evaluate(ast))
  if (result === null) return null
  return { kind: 'value', result }
}

export function sampleExpression(source, { from = -10, to = 10, steps = 120 } = {}) {
  const ast = parse(source)
  if (!ast || !containsVariable(ast)) return []

  const points = []
  const stride = (to - from) / steps

  for (let i = 0; i <= steps; i++) {
    const x = from + i * stride
    const y = evaluate(ast, { x })
    if (y === null) continue
    points.push({ x: Math.round(x * 1e6) / 1e6, y: Math.round(y * 1e6) / 1e6 })
  }

  return points
}
