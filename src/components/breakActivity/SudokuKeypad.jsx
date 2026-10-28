import { Eraser, Pencil, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const ACTION_CLASS = 'h-10 min-w-0 justify-start'

function ActionLabel({ children }) {
  return <span className="truncate">{children}</span>
}

export function SudokuKeypad({ onDigit, completed, notesMode, onToggleNotes, onNew, eraseLabel, notesLabel, newLabel, disabled, className }) {
  return (
    <div className={cn('grid grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.4fr)] grid-rows-3 gap-1.5', className)}>
      {DIGITS.map(digit => (
        <Button key={digit} type="button" variant="outline" disabled={disabled}
          className={cn('h-10 text-base tabular-nums', completed.has(digit) && 'text-muted-foreground/40')}          onClick={() => onDigit(digit)}>
          {digit}
        </Button>
      ))}
      <Button type="button" variant="outline" disabled={disabled} className={cn(ACTION_CLASS, 'col-start-4 row-start-1')}
        title={eraseLabel} onClick={() => onDigit(0)}>
        <Eraser />
        <ActionLabel>{eraseLabel}</ActionLabel>
      </Button>
      <Button type="button" variant={notesMode ? 'default' : 'outline'} className={cn(ACTION_CLASS, 'col-start-4 row-start-2')}
        title={notesLabel} aria-pressed={notesMode} onClick={onToggleNotes}>
        <Pencil />
        <ActionLabel>{notesLabel}</ActionLabel>
      </Button>
      <Button type="button" variant="outline" className={cn(ACTION_CLASS, 'col-start-4 row-start-3')}
        title={newLabel} onClick={onNew}>
        <RotateCcw />
        <ActionLabel>{newLabel}</ActionLabel>
      </Button>
    </div>
  )
}
