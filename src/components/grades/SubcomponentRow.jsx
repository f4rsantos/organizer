import { GradeInput } from './GradeInput'
import { X } from 'lucide-react'
import { SubcomponentPercent } from './SubcomponentPercent'

export function SubcomponentRow({ sub, percent, index, onGradeChange, onWeightChange, onRemove }) {
  return (
    <div className="group/sub flex items-center gap-3 py-1 pl-5">
      <p className="flex-1 min-w-0 text-xs text-muted-foreground/70">
        {index + 1} <SubcomponentPercent percent={percent} onChange={onWeightChange ? v => onWeightChange(sub.id, v) : null} />
      </p>
      <GradeInput
        value={sub.grade}
        onChange={v => onGradeChange(sub.id, v)}
        className="w-16 h-7 text-center text-sm"
      />
      <button
        onClick={() => onRemove(sub.id)}
        className="rounded p-1 text-muted-foreground/30 transition-colors hover:text-destructive"
      >
        <X size={12} />
      </button>
    </div>
  )
}
