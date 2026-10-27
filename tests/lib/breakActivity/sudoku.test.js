import { describe, it, expect } from 'vitest'
import {
  completedSudokuDigits, countSudokuSolutions, fillSudokuCell, generateSudoku, isSudokuSolved, normalizeBreakSudoku,
  stepSudokuSelection, sudokuConflicts, toggleSudokuNote,
} from '../../../src/lib/breakActivity/sudoku.js'

function seededRandom(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clueCount = puzzle => [...puzzle].filter(c => c !== '0').length

describe('generateSudoku', () => {
  it('produces a puzzle with exactly one solution, matching the stored solution', () => {
    const game = generateSudoku({ difficulty: 'hard', random: seededRandom(7) })
    expect(countSudokuSolutions(game.puzzle, 2)).toBe(1)
    for (let i = 0; i < 81; i++) {
      if (game.puzzle[i] !== '0') expect(game.puzzle[i]).toBe(game.solution[i])
    }
    expect(sudokuConflicts(game.solution).size).toBe(0)
    expect(game.solution).not.toContain('0')
  })

  it('gives fewer clues as difficulty rises', () => {
    const random = seededRandom(42)
    const easy = clueCount(generateSudoku({ difficulty: 'easy', random }).puzzle)
    const medium = clueCount(generateSudoku({ difficulty: 'medium', random }).puzzle)
    const hard = clueCount(generateSudoku({ difficulty: 'hard', random }).puzzle)
    expect(easy).toBeGreaterThan(medium)
    expect(medium).toBeGreaterThan(hard)
  })

  it('starts with the player entries equal to the givens', () => {
    const game = generateSudoku({ difficulty: 'easy', random: seededRandom(3) })
    expect(game.entries).toBe(game.puzzle)
    expect(isSudokuSolved(game)).toBe(false)
  })
})

describe('fillSudokuCell', () => {
  const game = generateSudoku({ difficulty: 'medium', random: seededRandom(11) })
  const givenIndex = [...game.puzzle].findIndex(c => c !== '0')
  const emptyIndex = [...game.puzzle].findIndex(c => c === '0')

  it('never overwrites a given', () => {
    expect(fillSudokuCell(game, givenIndex, 5)).toBe(game)
  })

  it('writes and clears an empty cell', () => {
    const filled = fillSudokuCell(game, emptyIndex, 4)
    expect(filled.entries[emptyIndex]).toBe('4')
    expect(fillSudokuCell(filled, emptyIndex, 0).entries[emptyIndex]).toBe('0')
  })

  it('reports solved once every entry matches the solution', () => {
    let current = game
    for (let i = 0; i < 81; i++) {
      if (game.puzzle[i] === '0') current = fillSudokuCell(current, i, Number(game.solution[i]))
    }
    expect(isSudokuSolved(current)).toBe(true)
  })
})

describe('sudokuConflicts', () => {
  it('flags duplicates in a row, a column and a box but ignores empty cells', () => {
    const cells = Array(81).fill('0')
    cells[0] = '5'
    cells[8] = '5'
    cells[72] = '3'
    cells[80] = '0'
    cells[30] = '7'
    cells[40] = '7'
    const conflicts = sudokuConflicts(cells.join(''))
    expect([...conflicts].sort((a, b) => a - b)).toEqual([0, 8, 30, 40])
  })
})

describe('normalizeBreakSudoku', () => {
  const game = generateSudoku({ difficulty: 'easy', random: seededRandom(5) })

  it('keeps a valid saved game so progress survives across breaks', () => {
    const progressed = fillSudokuCell(game, [...game.puzzle].indexOf('0'), 9)
    expect(normalizeBreakSudoku(progressed)).toEqual(progressed)
  })

  it('drops a corrupted game instead of rendering a broken board', () => {
    expect(normalizeBreakSudoku(null)).toBeNull()
    expect(normalizeBreakSudoku({ ...game, entries: game.entries.slice(1) })).toBeNull()
    expect(normalizeBreakSudoku({ ...game, difficulty: 'impossible' })).toBeNull()
    const givenIndex = [...game.puzzle].findIndex(c => c !== '0')
    const tampered = game.entries.slice(0, givenIndex) + '0' + game.entries.slice(givenIndex + 1)
    expect(normalizeBreakSudoku({ ...game, entries: tampered })).toBeNull()
  })

  it('upgrades a game saved before notes existed with empty notes', () => {
    const { notes: _notes, ...legacy } = game
    expect(normalizeBreakSudoku(legacy).notes).toEqual(Array(81).fill(''))
  })

  it('drops malformed notes instead of the whole game', () => {
    const restored = normalizeBreakSudoku({ ...game, notes: ['12x', ...Array(80).fill('')] })
    expect(restored.notes[0]).toBe('')
    expect(restored.entries).toBe(game.entries)
  })
})

describe('toggleSudokuNote', () => {
  const game = generateSudoku({ difficulty: 'medium', random: seededRandom(13) })
  const emptyIndex = [...game.puzzle].findIndex(c => c === '0')
  const givenIndex = [...game.puzzle].findIndex(c => c !== '0')

  it('adds and removes a pencil mark, keeping digits sorted', () => {
    const marked = toggleSudokuNote(toggleSudokuNote(game, emptyIndex, 7), emptyIndex, 2)
    expect(marked.notes[emptyIndex]).toBe('27')
    expect(toggleSudokuNote(marked, emptyIndex, 7).notes[emptyIndex]).toBe('2')
  })

  it('erasing an empty cell clears its pencil marks', () => {
    const marked = toggleSudokuNote(game, emptyIndex, 8)
    expect(fillSudokuCell(marked, emptyIndex, 0).notes[emptyIndex]).toBe('')
  })

  it('ignores givens and cells that already hold a digit', () => {
    expect(toggleSudokuNote(game, givenIndex, 3)).toBe(game)
    const filled = fillSudokuCell(game, emptyIndex, 4)
    expect(toggleSudokuNote(filled, emptyIndex, 3)).toBe(filled)
  })

  it('placing a digit clears that cell and removes the digit from notes in its row, column and box', () => {
    const peer = [...game.puzzle].findIndex((c, i) => c === '0' && i !== emptyIndex && Math.floor(i / 9) === Math.floor(emptyIndex / 9))
    const far = [...game.puzzle].findIndex((c, i) => c === '0' && Math.floor(i / 9) !== Math.floor(emptyIndex / 9)
      && i % 9 !== emptyIndex % 9 && Math.floor(i / 27) !== Math.floor(emptyIndex / 27))
    let marked = toggleSudokuNote(game, emptyIndex, 5)
    marked = toggleSudokuNote(toggleSudokuNote(marked, peer, 4), peer, 6)
    marked = toggleSudokuNote(marked, far, 4)
    const filled = fillSudokuCell(marked, emptyIndex, 4)
    expect(filled.notes[emptyIndex]).toBe('')
    expect(filled.notes[peer]).toBe('6')
    expect(filled.notes[far]).toBe('4')
  })
})

describe('completedSudokuDigits', () => {
  it('lists only digits placed in all nine cells', () => {
    const game = generateSudoku({ difficulty: 'easy', random: seededRandom(17) })
    let current = game
    for (let i = 0; i < 81; i++) {
      if (game.puzzle[i] === '0' && game.solution[i] === '3') current = fillSudokuCell(current, i, 3)
    }
    const done = completedSudokuDigits(current.entries)
    expect(done.has(3)).toBe(true)
    const unfinished = [...current.entries].findIndex(c => c === '0')
    expect(done.has(Number(game.solution[unfinished]))).toBe(false)
  })
})

describe('stepSudokuSelection', () => {
  it('moves the selection with arrow keys and stops at the board edges', () => {
    expect(stepSudokuSelection(40, 'ArrowUp')).toBe(31)
    expect(stepSudokuSelection(40, 'ArrowDown')).toBe(49)
    expect(stepSudokuSelection(40, 'ArrowLeft')).toBe(39)
    expect(stepSudokuSelection(40, 'ArrowRight')).toBe(41)
    expect(stepSudokuSelection(0, 'ArrowUp')).toBe(0)
    expect(stepSudokuSelection(9, 'ArrowLeft')).toBe(9)
    expect(stepSudokuSelection(8, 'ArrowRight')).toBe(8)
    expect(stepSudokuSelection(80, 'ArrowDown')).toBe(80)
  })

  it('selects the first cell when nothing is selected yet', () => {
    expect(stepSudokuSelection(null, 'ArrowRight')).toBe(0)
  })
})
