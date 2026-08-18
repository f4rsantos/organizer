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
  const memberships = useStore(s => s.collab?.memberships ?? [])
  const t = useStrings(lang)

  const kanbanChecklistPreviewMode = settings.kanbanChecklistPreviewMode
    ?? (settings.kanbanShowChecklistInline ? 'all' : 'none')
  const autoAddToFirstColumn = settings.kanbanAutoAddToFirstColumn ?? false
  const separateByClass = settings.kanbanSeparateByClass ?? false
  const separateByTeam = settings.kanbanSeparateByTeam ?? true
  const collabActive = (settings.collabEnabled ?? false) && memberships.length > 0

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

      <div className="space-y-1.5">
        <Label>{t.kanbanAutoAddLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.kanbanAutoAddDesc}</p>
        <button type="button" onClick={() => updateSettings({ kanbanAutoAddToFirstColumn: !autoAddToFirstColumn })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {autoAddToFirstColumn
            ? <CircleCheck className="h-4 w-4 text-primary" />
            : <Circle className="h-4 w-4" />}
          {autoAddToFirstColumn ? t.settingEnabled : t.settingDisabled}
        </button>
      </div>

      <div className="space-y-1.5">
        <Label>{t.collabSeparateByClass ?? 'Separate by class'}</Label>
        <button type="button" onClick={() => updateSettings({ kanbanSeparateByClass: !separateByClass })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {separateByClass
            ? <CircleCheck className="h-4 w-4 text-primary" />
            : <Circle className="h-4 w-4" />}
          {separateByClass ? t.settingEnabled : t.settingDisabled}
        </button>
      </div>

      {collabActive && (
        <div className="space-y-1.5">
          <Label>{t.collabSeparateByTeam ?? 'Separate by team'}</Label>
          <button type="button" onClick={() => updateSettings({ kanbanSeparateByTeam: !separateByTeam })}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {separateByTeam
              ? <CircleCheck className="h-4 w-4 text-primary" />
              : <Circle className="h-4 w-4" />}
            {separateByTeam ? t.settingEnabled : t.settingDisabled}
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>{t.kanbanColumns}</Label>
        <KanbanColumnsForm semesterId={semesterId} columns={columns} />
      </div>
    </div>
  )
}
