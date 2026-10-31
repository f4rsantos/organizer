import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { nanoid } from '@/lib/ids'

function EntryChip({ label, removeLabel, onRemove }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-border bg-card py-1 pl-3 pr-1.5 text-xs font-medium">
      {label}
      {onRemove && (
        <button type="button" aria-label={removeLabel} onClick={onRemove}
          className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-destructive">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

function SuggestionChip({ label, onAdd }) {
  return (
    <button type="button" onClick={onAdd}
      className="flex items-center gap-1 rounded-full border border-dashed border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground">
      <Plus className="h-3 w-3" />{label}
    </button>
  )
}

export function EditableEntryList({ entries, builtIns, labelOf, placeholder, removeLabel, onChange }) {
  const [draft, setDraft] = useState('')
  const usedIds = new Set(entries.map(entry => entry.id))
  const missing = builtIns.filter(entry => !usedIds.has(entry.id))
  const canRemove = entries.length > 1

  const addCustom = () => {
    const label = draft.trim()
    if (!label) return
    onChange([...entries, { id: `custom-${nanoid()}`, label }])
    setDraft('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {entries.map(entry => (
          <EntryChip key={entry.id} label={labelOf(entry)} removeLabel={removeLabel}
            onRemove={canRemove ? () => onChange(entries.filter(other => other.id !== entry.id)) : null} />
        ))}
        {missing.map(entry => (
          <SuggestionChip key={entry.id} label={labelOf(entry)} onAdd={() => onChange([...entries, entry])} />
        ))}
      </div>
      <Input className="h-8 text-sm" value={draft} placeholder={placeholder}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
        onBlur={addCustom} />
    </div>
  )
}
