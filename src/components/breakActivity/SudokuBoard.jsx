import { cn } from '@/lib/utils'
import { sharesSudokuUnit } from '@/lib/breakActivity/sudoku'

const SIZE = 9
const BOX = 3
const NOTE_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

function cellBorders(index) {
  const row = Math.floor(index / SIZE)
  const col = index % SIZE
  return cn(
    col % BOX === BOX - 1 && col !== SIZE - 1 && 'border-r-2 border-r-foreground/40',
    row % BOX === BOX - 1 && row !== SIZE - 1 && 'border-b-2 border-b-foreground/40',
    col === SIZE - 1 && 'border-r-0',
    row === SIZE - 1 && 'border-b-0',
  )
}

function CellNotes({ notes, highlight }) {
  return (
    <span className="grid size-full grid-cols-3 grid-rows-3 p-px text-[0.5rem] leading-none text-muted-foreground sm:text-[0.6rem]">
      {NOTE_DIGITS.map(d => (
        <span key={d} className={cn('flex items-center justify-center', d === highlight && 'font-bold text-primary')}>
          {notes.includes(d) ? d : ''}
        </span>
      ))}
    </span>
  )
}

function SudokuCell({ index, value, notes, given, selected, related, sameDigit, selectedDigit, conflict, onSelect }) {
  return (
    <button type="button" onClick={() => onSelect(index)}
      className={cn(
        'flex aspect-square items-center justify-center border-r border-b border-border text-base tabular-nums sm:text-lg',
        cellBorders(index),
        given ? 'font-semibold text-foreground' : 'text-primary',
        related && 'bg-muted/60',
        sameDigit && 'bg-primary/15',
        selected && 'bg-primary/30',
        conflict && 'text-destructive',
      )}>
      {value === '0' ? <CellNotes notes={notes} highlight={selectedDigit} /> : value}
    </button>
  )
}

export function SudokuBoard({ game, selected, conflicts, onSelect }) {
  const selectedDigit = selected === null ? '0' : game.entries[selected]
  return (
    <div className="grid grid-cols-9 overflow-hidden rounded-md border-2 border-foreground/40">
      {[...game.entries].map((value, index) => (
        <SudokuCell key={index} index={index} value={value} notes={game.notes?.[index] ?? ''} selectedDigit={selectedDigit}
          given={game.puzzle[index] !== '0'}
          selected={selected === index}
          related={selected !== null && sharesSudokuUnit(index, selected)}
          sameDigit={value !== '0' && value === selectedDigit}
          conflict={conflicts.has(index)}
          onSelect={onSelect} />
      ))}
    </div>
  )
}
