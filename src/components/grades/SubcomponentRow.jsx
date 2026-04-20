import { GradeInput } from './GradeInput'
import { X } from 'lucide-react'

export function SubcomponentRow({ sub, subWeight, onGradeChange, onRemove }) {
  const pct = parseFloat((subWeight * 100).toFixed(1))

  return (
    <div className="flex items-center gap-3 py-1.5 pl-6 border-b border-border/30 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{pct}%</p>
      </div>
      <GradeInput
        value={sub.grade}
        onChange={v => onGradeChange(sub.id, v)}
        className="w-20 h-7 text-center text-sm"
      />
      <button
        onClick={() => onRemove(sub.id)}
        className="text-muted-foreground hover:text-destructive p-1 rounded"
      >
        <X size={12} />
      </button>
    </div>
  )
}
