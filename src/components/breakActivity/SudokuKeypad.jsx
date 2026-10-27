import { Eraser, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function SudokuKeypad({ onDigit, completed, notesMode, onToggleNotes, eraseLabel, notesLabel, disabled }) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {DIGITS.map(digit => (
        <Button key={digit} type="button" variant="outline" disabled={disabled}
          className={cn('h-10 text-base tabular-nums', completed.has(digit) && 'text-muted-foreground/40')}
          onClick={() => onDigit(digit)}>
          {digit}
        </Button>
      ))}
      <Button type="button" variant="outline" disabled={disabled} className="h-10"
        aria-label={eraseLabel} title={eraseLabel} onClick={() => onDigit(0)}>
        <Eraser />
      </Button>
      <Button type="button" variant={notesMode ? 'default' : 'outline'} className="col-span-2 h-10"
        aria-pressed={notesMode} onClick={onToggleNotes}>
        <Pencil />
        {notesLabel}
      </Button>
    </div>
  )
}
