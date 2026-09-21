import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { describeOpRows, totalOpCount } from '../runSummary'

function OpRow({ op, t }) {
  const fallbackLabel = op.entityType === 'note'
    ? t.aiTargetUntitled
    : (t[op.entityType] || op.entityType || '')
  return (
    <li className="text-sm flex items-baseline gap-2">
      <span className="text-muted-foreground shrink-0">{op.verb}</span>
      <span className="truncate">{op.label || fallbackLabel}</span>
    </li>
  )
}

export function PlanConfirmPane({ run, onCommit, onDiscard, t }) {
  if (!run) return null
  const ops = run.ops ?? []
  if (!ops.length) return null
  const store = useStore.getState()
  const rows = describeOpRows(ops, t, store)
  const opCount = totalOpCount(ops)

  return (
    <div className="border-t border-border pt-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{t.aiConfirmHeading}</p>
      <ul className="space-y-1 max-h-48 overflow-y-auto">
        {rows.map((op, index) => <OpRow key={op.id ?? index} op={op} t={t} />)}
      </ul>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => onCommit(run.id)} className="gap-1.5">
          <Check className="h-3.5 w-3.5" />
          {t.aiConfirmApprove}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDiscard(run.id)} className="gap-1.5">
          <X className="h-3.5 w-3.5" />
          {t.aiConfirmDiscard}
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">{(t.aiConfirmOpCount ?? '').replace('{count}', opCount)}</span>
      </div>
    </div>
  )
}
