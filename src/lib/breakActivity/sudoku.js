export const SUDOKU_DIFFICULTIES = ['easy', 'medium', 'hard']

const TARGET_CLUES = { easy: 40, medium: 32, hard: 25 }
const CELLS = 81
const SIZE = 9
const BOX = 3
const ALL_DIGITS = 0b1111111110
const EMPTY = '0'
const BOARD_PATTERN = /^[0-9]{81}$/
const SOLUTION_PATTERN = /^[1-9]{81}$/
const NOTE_PATTERN = /^[1-9]{0,9}$/

const rowOf = i => Math.floor(i / SIZE)
const colOf = i => i % SIZE
const boxOf = i => Math.floor(rowOf(i) / BOX) * BOX + Math.floor(colOf(i) / BOX)

function shuffled(items, random) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function digitsIn(mask) {
  const digits = []
  for (let d = 1; d <= SIZE; d++) if (mask & (1 << d)) digits.push(d)
  return digits
}

function createBoard(cells) {
  const rows = Array(SIZE).fill(0)
  const cols = Array(SIZE).fill(0)
  const boxes = Array(SIZE).fill(0)
  cells.forEach((digit, i) => {
    if (!digit) return
    const bit = 1 << digit
    rows[rowOf(i)] |= bit
    cols[colOf(i)] |= bit
    boxes[boxOf(i)] |= bit
  })
  return { cells, rows, cols, boxes }
}

function place(board, i, digit) {
  const bit = 1 << digit
  board.cells[i] = digit
  board.rows[rowOf(i)] ^= bit
  board.cols[colOf(i)] ^= bit
  board.boxes[boxOf(i)] ^= bit
}

function unplace(board, i, digit) {
  place(board, i, digit)
  board.cells[i] = 0
}

function candidates(board, i) {
  return ALL_DIGITS & ~(board.rows[rowOf(i)] | board.cols[colOf(i)] | board.boxes[boxOf(i)])
}

function mostConstrainedCell(board) {
  let best = -1
  let bestCount = SIZE + 1
  for (let i = 0; i < CELLS; i++) {
    if (board.cells[i]) continue
    const count = digitsIn(candidates(board, i)).length
    if (count < bestCount) {
      best = i
      bestCount = count
      if (count <= 1) break
    }
  }
  return best
}

function search(board, limit, order) {
  const i = mostConstrainedCell(board)
  if (i === -1) return 1
  let found = 0
  for (const digit of order(digitsIn(candidates(board, i)))) {
    place(board, i, digit)
    found += search(board, limit - found, order)
    if (found >= limit) return found
    unplace(board, i, digit)
  }
  return found
}

function parseCells(text) {
  return [...text].map(Number)
}

export function countSudokuSolutions(puzzle, limit = 2) {
  const board = createBoard(parseCells(puzzle))
  return search(board, limit, digits => digits)
}

function randomSolution(random) {
  const board = createBoard(Array(CELLS).fill(0))
  search(board, 1, digits => shuffled(digits, random))
  return board.cells
}

function carvePuzzle(solution, targetClues, random) {
  const cells = [...solution]
  let clues = CELLS
  for (const i of shuffled([...Array(CELLS).keys()], random)) {
    if (clues <= targetClues) break
    const kept = cells[i]
    cells[i] = 0
    if (countSudokuSolutions(cells.join(''), 2) === 1) clues--
    else cells[i] = kept
  }
  return cells
}

export function generateSudoku({ difficulty, random = Math.random }) {
  const level = SUDOKU_DIFFICULTIES.includes(difficulty) ? difficulty : 'medium'
  const solution = randomSolution(random)
  const puzzle = carvePuzzle(solution, TARGET_CLUES[level], random).join('')
  return { difficulty: level, puzzle, solution: solution.join(''), entries: puzzle, notes: emptyNotes() }
}

function emptyNotes() {
  return Array(CELLS).fill('')
}

export function fillSudokuCell(game, index, digit) {
  if (game.puzzle[index] !== EMPTY) return game
  const value = Number.isInteger(digit) && digit >= 1 && digit <= SIZE ? String(digit) : EMPTY
  const notes = game.notes ?? emptyNotes()
  if (game.entries[index] === value && !notes[index]) return game
  const nextNotes = notes.map((cellNotes, i) => {
    if (i === index) return ''
    if (value === EMPTY || !sharesSudokuUnit(i, index)) return cellNotes
    return cellNotes.replace(value, '')
  })
  return { ...game, entries: game.entries.slice(0, index) + value + game.entries.slice(index + 1), notes: nextNotes }
}

export function toggleSudokuNote(game, index, digit) {
  if (game.entries[index] !== EMPTY) return game
  const notes = game.notes ?? emptyNotes()
  const mark = String(digit)
  const current = notes[index]
  const toggled = current.includes(mark) ? current.replace(mark, '') : [...current, mark].sort().join('')
  return { ...game, notes: notes.map((cellNotes, i) => (i === index ? toggled : cellNotes)) }
}

export function completedSudokuDigits(entries) {
  const counts = new Map()
  for (const c of entries) if (c !== EMPTY) counts.set(Number(c), (counts.get(Number(c)) ?? 0) + 1)
  return new Set([...counts].filter(([, count]) => count === SIZE).map(([digit]) => digit))
}

export function isSudokuSolved(game) {
  return Boolean(game) && game.entries === game.solution
}

export function sharesSudokuUnit(a, b) {
  return rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b)
}

export function sudokuConflicts(entries) {
  const conflicts = new Set()
  for (let a = 0; a < CELLS; a++) {
    if (entries[a] === EMPTY) continue
    for (let b = a + 1; b < CELLS; b++) {
      if (entries[b] !== entries[a] || !sharesSudokuUnit(a, b)) continue
      conflicts.add(a)
      conflicts.add(b)
    }
  }
  return conflicts
}

function keepsGivens(game) {
  return [...game.puzzle].every((c, i) => c === EMPTY || (game.entries[i] === c && game.solution[i] === c))
}

export function normalizeBreakSudoku(value) {
  if (!value || typeof value !== 'object') return null
  const { difficulty, puzzle, solution, entries } = value
  if (!SUDOKU_DIFFICULTIES.includes(difficulty)) return null
  if (![puzzle, entries].every(s => typeof s === 'string' && BOARD_PATTERN.test(s))) return null
  if (typeof solution !== 'string' || !SOLUTION_PATTERN.test(solution)) return null
  if (!keepsGivens(value)) return null
  return { difficulty, puzzle, solution, entries, notes: normalizeNotes(value.notes, entries) }
}

function normalizeNotes(notes, entries) {
  if (!Array.isArray(notes) || notes.length !== CELLS) return emptyNotes()
  return notes.map((cellNotes, i) => (
    entries[i] === EMPTY && typeof cellNotes === 'string' && NOTE_PATTERN.test(cellNotes) ? cellNotes : ''
  ))
}

const STEPS = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
}

const clampToBoard = n => Math.min(SIZE - 1, Math.max(0, n))

export function stepSudokuSelection(index, key) {
  const step = STEPS[key]
  if (index === null || !step) return index ?? 0
  return clampToBoard(rowOf(index) + step.row) * SIZE + clampToBoard(colOf(index) + step.col)
}
