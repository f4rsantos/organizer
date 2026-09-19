import { formatDistanceToNow } from 'date-fns'
import { Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isLifoUndoTarget } from '@/lib/ai/journal'
import { formatRunSummary } from '../runSummary'

function scopeLabel(scope, t) {
  if (!scope || scope.type === 'global') return t.aiScopeGlobal
  if (scope.type === 'folder') return t.aiScopeFolder
  if (scope.type === 'class') return t.aiScopeClass
  if (scope.type === 'semester') return t.aiScopeSemester
  if (Array.isArray(scope.ids) && scope.ids.length) return t.aiScopeSelection
  return t.aiScopeGlobal
}

function JournalEntryRow({ entry, journal, onUndo, t }) {
  const ops = entry.inverse ?? []
  const summary = formatRunSummary(
    ops.map(op => ({ entityType: op.entityType, type: op.type })),
    t,
  )
  const canUndo = entry.undoable && isLifoUndoTarget(journal, entry.runId)

  return (
    <li className="py-2 space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{formatDistanceToNow(entry.ranAt, { addSuffix: true })}</span>
        <span>{scopeLabel(entry.scope, t)}</span>
      </div>
      <p className="text-sm">{summary || t.aiSummaryNoChanges}</p>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{entry.model ? `${entry.slot ?? ''} · ${entry.model}` : t.aiJournalUnknownModel}</span>
        <span>{(t.aiJournalRequestCount ?? '').replace('{count}', entry.requestCount ?? 0)}</span>
      </div>
      {entry.undoable && (
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-xs h-7 px-2 -ml-2"
          disabled={!canUndo}
          onClick={() => onUndo(entry.runId)}
          title={canUndo ? undefined : t.aiJournalUndoBlocked}
        >
          <Undo2 className="h-3.5 w-3.5" />
          {t.aiJournalUndo}
        </Button>
      )}
    </li>
  )
}

export function JournalPane({ journal, onUndo, t }) {
  const entries = journal?.entries ?? []

  if (!entries.length) {
    return <p className="text-sm text-muted-foreground px-1">{t.aiJournalEmpty}</p>
  }

  return (
    <ul className="divide-y divide-border">
      {entries.map(entry => (
        <JournalEntryRow key={entry.runId} entry={entry} journal={journal} onUndo={onUndo} t={t} />
      ))}
    </ul>
  )
}
