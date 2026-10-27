import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { fireConfetti } from '@/lib/confetti'
import {
  completedSudokuDigits, fillSudokuCell, generateSudoku, isSudokuSolved, stepSudokuSelection, sudokuConflicts, toggleSudokuNote,
} from '@/lib/breakActivity/sudoku'
import { SudokuBoard } from './SudokuBoard'
import { SudokuKeypad } from './SudokuKeypad'

const DIGIT_KEY = /^[1-9]$/
const ERASE_KEYS = ['Backspace', 'Delete', '0']
const NOTES_KEY = 'n'

function difficultyLabel(t, difficulty) {
  if (difficulty === 'easy') return t.sudokuEasy
  if (difficulty === 'hard') return t.sudokuHard
  return t.sudokuMedium
}

export function BreakSudokuDialog({ open, onOpenChange, game, difficulty, t }) {
  const setBreakSudoku = useStore(s => s.setBreakSudoku)
  const [selected, setSelected] = useState(null)
  const [notesMode, setNotesMode] = useState(false)
  const solved = isSudokuSolved(game)
  const conflicts = useMemo(() => sudokuConflicts(game.entries), [game.entries])
  const completed = useMemo(() => completedSudokuDigits(game.entries), [game.entries])

  const enterDigit = digit => {
    if (selected === null || solved) return
    const next = notesMode && digit > 0 ? toggleSudokuNote(game, selected, digit) : fillSudokuCell(game, selected, digit)
    if (next === game) return
    setBreakSudoku(next)
    if (isSudokuSolved(next)) fireConfetti()
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = e => {
      if (DIGIT_KEY.test(e.key)) enterDigit(Number(e.key))
      else if (ERASE_KEYS.includes(e.key)) enterDigit(0)
      else if (e.key.startsWith('Arrow')) setSelected(index => stepSudokuSelection(index, e.key))
      else if (e.key.toLowerCase() === NOTES_KEY) setNotesMode(v => !v)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const startNew = () => {
    setSelected(null)
    setBreakSudoku(generateSudoku({ difficulty }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.sudoku}</DialogTitle>
          <DialogDescription>{solved ? t.sudokuSolved : difficultyLabel(t, game.difficulty)}</DialogDescription>
        </DialogHeader>
        <SudokuBoard game={game} selected={selected} conflicts={conflicts} onSelect={setSelected} />
        <SudokuKeypad onDigit={enterDigit} completed={completed} notesMode={notesMode} onToggleNotes={() => setNotesMode(v => !v)}
          eraseLabel={t.sudokuErase} notesLabel={t.sudokuNotes} disabled={solved || selected === null} />
        <Button type="button" variant="ghost" size="sm" onClick={startNew}>{t.sudokuNewPuzzle}</Button>
      </DialogContent>
    </Dialog>
  )
}
