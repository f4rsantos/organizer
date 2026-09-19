import { useMemo } from 'react'
import { Gauge } from 'lucide-react'
import { formatBudget, loadBudgetState } from '@/lib/ai/budget'

export function BudgetMeter({ t, slots }) {
  const budgetState = useMemo(() => loadBudgetState(), [])
  const labels = useMemo(() => ({
    low: t.aiSlotLow, medium: t.aiSlotMedium, high: t.aiSlotHigh,
  }), [t])

  const summary = formatBudget(budgetState, slots, labels)
  if (!summary) return null

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
      <Gauge className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <p className="text-xs text-muted-foreground">{summary}</p>
    </div>
  )
}
