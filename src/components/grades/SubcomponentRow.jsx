import { GradeInput } from './GradeInput'
import { X } from 'lucide-react'

export function SubcomponentRow({ sub, subWeight, index, onGradeChange, onRemove }) {
  const pct = parseFloat((subWeight * 100).toFixed(1))

  return (
    <div className="group/sub flex items-center gap-3 py-1 pl-5">
      <p className="flex-1 min-w-0 text-xs text-muted-foreground/70">
        {index + 1} <span className="text-muted-foreground/40">· {pct}%</span>
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
