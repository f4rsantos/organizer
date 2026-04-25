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
        <Select value={kanbanChecklistPreviewMode} onValueChange={v => updateSettings({ kanbanChecklistPreviewMode: v })}>
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

      <div className="space-y-1.5">
        <Label>{t.kanbanColumns}</Label>
        <KanbanColumnsForm semesterId={semesterId} columns={columns} />
      </div>
    </div>
  )
}
