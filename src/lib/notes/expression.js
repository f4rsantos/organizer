const CONSTANTS = {
  pi: Math.PI,
  e: Math.E,
}

const FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  log: Math.log10,
  ln: Math.log,
  sqrt: Math.sqrt,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  min: Math.min,
  max: Math.max,
}

const VARIABLE = 'x'

const OPERATORS = {
  '+': { precedence: 1, associativity: 'left', apply: (a, b) => a + b },
  '-': { precedence: 1, associativity: 'left', apply: (a, b) => a - b },
  '*': { precedence: 2, associativity: 'left', apply: (a, b) => a * b },
  '/': { precedence: 2, associativity: 'left', apply: (a, b) => a / b },
  '%': { precedence: 2, associativity: 'left', apply: (a, b) => a % b },
  '^': { precedence: 4, associativity: 'right', apply: (a, b) => a ** b },
}

const NUMBER_PATTERN = /^\d+(\.\d+)?/
const NAME_PATTERN = /^[a-z]+/i

function tokenize(source) {
  const tokens = []
  let rest = source

  while (rest.length) {
    const char = rest[0]

    if (char === ' ' || char === '\t') {
      rest = rest.slice(1)
      continue
    }

    const number = rest.match(NUMBER_PATTERN)
    if (number) {
      tokens.push({ type: 'number', value: Number(number[0]) })
      rest = rest.slice(number[0].length)
      continue
    }

    const name = rest.match(NAME_PATTERN)
    if (name) {
      const lower = name[0].toLowerCase()
      if (Object.hasOwn(FUNCTIONS, lower)) tokens.push({ type: 'function', name: lower })
      else if (Object.hasOwn(CONSTANTS, lower)) tokens.push({ type: 'number', value: CONSTANTS[lower] })
      else if (lower === VARIABLE) tokens.push({ type: 'variable' })
      else return null
      rest = rest.slice(name[0].length)
      continue
    }

    if (Object.hasOwn(OPERATORS, char)) {
      tokens.push({ type: 'operator', value: char })
      rest = rest.slice(1)
      continue
    }

    if (char === '(' || char === ')' || char === ',') {
      tokens.push({ type: char })
      rest = rest.slice(1)
      continue
    }

    return null
  }

  return tokens
}

function isValueToken(token) {
  return token && (token.type === 'number' || token.type === 'variable' || token.type === ')')
}

function startsValue(token) {
  return token && (token.type === 'number' || token.type === 'variable' || token.type === 'function' || token.type === '(')
}

// "3x" and "2(x+1)" are written without an operator; insert the implied one.
function insertImplicitMultiplication(tokens) {
  const out = []
  for (const token of tokens) {
    if (out.length && isValueToken(out[out.length - 1]) && startsValue(token)) {
      out.push({ type: 'operator', value: '*' })
    }
    out.push(token)
  }
  return out
}

function markUnaryMinus(tokens) {
  return tokens.map((token, index) => {
    if (token.type !== 'operator' || (token.value !== '-' && token.value !== '+')) return token
    if (isValueToken(tokens[index - 1])) return token
    return { type: 'unary', value: token.value }
  })
}

function popOperator(operators, output) {
  const operator = operators.pop()

  if (operator.type === 'function') {
    const args = []
    while (output.length && output[output.length - 1] !== undefined && args.length < operator.arity) {
      args.unshift(output.pop())
    }
    if (args.length !== operator.arity || args.some(a => a === undefined)) return false
    output.push({ type: 'call', name: operator.name, args })
    return true
  }

  if (operator.type === 'unary') {
    const operand = output.pop()
    if (!operand) return false
    output.push({ type: 'unary', value: operator.value, operand })
    return true
  }

  const right = output.pop()
  const left = output.pop()
  if (!left || !right) return false
  output.push({ type: 'binary', value: operator.value, left, right })
  return true
}

export function parse(source) {
  if (typeof source !== 'string' || !source.trim()) return null

  const rawTokens = tokenize(source)
  if (!rawTokens || !rawTokens.length) return null

  const tokens = markUnaryMinus(insertImplicitMultiplication(rawTokens))
  const output = []
  const operators = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token.type === 'number' || token.type === 'variable') {
      output.push(token)
      continue
    }

    if (token.type === 'function') {
      if (tokens[i + 1]?.type !== '(') return null
      operators.push({ ...token, arity: 1 })
      continue
    }

    if (token.type === ',') {
      while (operators.length && operators[operators.length - 1].type !== '(') {
        if (!popOperator(operators, output)) return null
      }
      if (!operators.length) return null
      const enclosing = operators[operators.length - 2]
      if (enclosing?.type !== 'function') return null
      enclosing.arity += 1
      continue
    }

    if (token.type === 'unary') {
      operators.push(token)
      continue
    }

    if (token.type === 'operator') {
      const current = OPERATORS[token.value]
      while (operators.length) {
        const top = operators[operators.length - 1]
        if (top.type !== 'operator' && top.type !== 'unary') break
        const topPrecedence = top.type === 'unary' ? 3 : OPERATORS[top.value].precedence
        const outranks = current.associativity === 'left'
          ? topPrecedence >= current.precedence
          : topPrecedence > current.precedence
        if (!outranks) break
        if (!popOperator(operators, output)) return null
      }
      operators.push(token)
      continue
    }

    if (token.type === '(') {
      operators.push(token)
      continue
    }

    if (token.type === ')') {
      while (operators.length && operators[operators.length - 1].type !== '(') {
        if (!popOperator(operators, output)) return null
      }
      if (!operators.length) return null
      operators.pop()
      if (operators[operators.length - 1]?.type === 'function') {
        if (!popOperator(operators, output)) return null
      }
      continue
    }
  }

  while (operators.length) {
    if (operators[operators.length - 1].type === '(') return null
    if (!popOperator(operators, output)) return null
  }

  if (output.length !== 1) return null
  return output[0]
}

export function evaluate(node, scope = {}) {
  if (!node) return null

  if (node.type === 'number') return node.value
  if (node.type === 'variable') {
    const value = scope[VARIABLE]
    return Number.isFinite(value) ? value : null
  }

  if (node.type === 'unary') {
    const operand = evaluate(node.operand, scope)
    if (operand === null) return null
    return node.value === '-' ? -operand : operand
  }

  if (node.type === 'binary') {
    const left = evaluate(node.left, scope)
    const right = evaluate(node.right, scope)
    if (left === null || right === null) return null
    const result = OPERATORS[node.value].apply(left, right)
    return Number.isFinite(result) ? result : null
  }

  if (node.type === 'call') {
    const args = node.args.map(arg => evaluate(arg, scope))
    if (args.some(arg => arg === null)) return null
    const result = FUNCTIONS[node.name](...args)
    return Number.isFinite(result) ? result : null
  }

  return null
}

export function containsVariable(node) {
  if (!node) return false
  if (node.type === 'variable') return true
  if (node.type === 'unary') return containsVariable(node.operand)
  if (node.type === 'binary') return containsVariable(node.left) || containsVariable(node.right)
  if (node.type === 'call') return node.args.some(containsVariable)
  return false
}

export function formatResult(value) {
  if (value === null) return null
  const rounded = Math.round(value * 1e10) / 1e10
  return String(rounded)
}

export function solve(source) {
  const ast = parse(source)
  if (!ast || containsVariable(ast)) return null
  return formatResult(evaluate(ast))
}
