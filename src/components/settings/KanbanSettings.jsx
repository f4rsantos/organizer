import { SettingList, SettingRow, SettingSelect, SettingToggle } from './SettingRow'
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
    <SettingList>
      <SettingSelect label={t.kanbanChecklistInlineLabel} desc={t.kanbanChecklistInlineDesc}
        value={kanbanChecklistPreviewMode} onChange={v => updateSettings({ kanbanChecklistPreviewMode: v })}
        options={kanbanChecklistPreviewOptions} />
      <SettingToggle label={t.kanbanAutoAddLabel} desc={t.kanbanAutoAddDesc} checked={autoAddToFirstColumn}
        onChange={v => updateSettings({ kanbanAutoAddToFirstColumn: v })} />
      <SettingToggle label={t.collabSeparateByClass} checked={separateByClass}
        onChange={v => updateSettings({ kanbanSeparateByClass: v })} />
      {collabActive && (
        <SettingToggle label={t.collabSeparateByTeam} checked={separateByTeam}
          onChange={v => updateSettings({ kanbanSeparateByTeam: v })} />
      )}
      <SettingRow label={t.kanbanColumns}>
        <KanbanColumnsForm semesterId={semesterId} columns={columns} />
      </SettingRow>
    </SettingList>
  )
}
