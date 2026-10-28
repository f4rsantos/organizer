import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
      <DialogContent className="max-w-md sm:max-w-md short:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.sudoku}</DialogTitle>
          <DialogDescription>{solved ? t.sudokuSolved : difficultyLabel(t, game.difficulty)}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 short:flex-row short:items-center">
          <SudokuBoard game={game} selected={selected} conflicts={conflicts} onSelect={setSelected}
            className="mx-auto w-full max-w-[calc(85dvh-16rem)] shrink-0 short:mx-0 short:w-[calc(85dvh-7rem)] short:max-w-[60%]" />
          <SudokuKeypad onDigit={enterDigit} completed={completed} notesMode={notesMode} onToggleNotes={() => setNotesMode(v => !v)}
            onNew={startNew} eraseLabel={t.sudokuErase} notesLabel={t.sudokuNotes} newLabel={t.sudokuNewPuzzle}
            disabled={solved || selected === null} className="short:flex-1" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
