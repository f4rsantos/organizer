import { Circle, CircleCheck } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { KanbanColumnsForm } from './KanbanColumnsForm'

export function KanbanSettings({ semesterId, columns }) {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const kanbanChecklistPreviewMode = settings.kanbanChecklistPreviewMode
    ?? (settings.kanbanShowChecklistInline ? 'all' : 'none')
  const autoAddToFirstColumn = settings.kanbanAutoAddToFirstColumn ?? false

  const kanbanChecklistPreviewOptions = [
    { value: 'none', label: t.kanbanChecklistPreviewNone },
    { value: 'all', label: t.kanbanChecklistPreviewAll },
    { value: 'card', label: t.kanbanChecklistPreviewPerCard },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t.kanbanChecklistInlineLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.kanbanChecklistInlineDesc}</p>
        <Select value={kanbanChecklistPreviewMode} onValueChange={v => updateSettings({ kanbanChecklistPreviewMode: v })} items={kanbanChecklistPreviewOptions}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {kanbanChecklistPreviewOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button type="button" onClick={() => updateSettings({ kanbanAutoAddToFirstColumn: !autoAddToFirstColumn })}
        className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-left transition-colors hover:bg-secondary/50">
        <span className="flex items-center justify-between gap-2">
          <span>
            <span className="block text-sm text-foreground">{t.kanbanAutoAddLabel}</span>
            <span className="block text-xs text-muted-foreground">{t.kanbanAutoAddDesc}</span>
          </span>
          <span className="text-muted-foreground shrink-0">
            {autoAddToFirstColumn
              ? <CircleCheck className="h-4 w-4 text-primary" />
              : <Circle className="h-4 w-4" />}
          </span>
        </span>
      </button>

      <div className="space-y-1.5">
        <Label>{t.kanbanColumns}</Label>
        <KanbanColumnsForm semesterId={semesterId} columns={columns} />
      </div>
    </div>
  )
}
