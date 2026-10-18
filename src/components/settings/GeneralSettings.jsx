import { ClassColorDot } from '@/components/settings/ClassColorDot'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { getAppById, getAppTabs } from '@/apps/registry'
import { WidgetSettings } from './WidgetSettings'
import { SettingList, SettingRow, SettingSelect, SettingToggle } from './SettingRow'

const CORE_TAB_IDS = ['tasks', 'kanban', 'grades', 'calendar', 'focus', 'notes', 'settings']

function ColorSwatch({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <ClassColorDot compact color={value} onChange={onChange} />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  )
}

export function GeneralSettings() {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const setSemesterMode = useStore(s => s.setSemesterMode)
  const workMode = useStore(s => s.settings?.workMode ?? false)
  const noneMode = (settings?.semesterMode ?? 'semesters') === 'none'
  const state = useStore(s => s)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const speechInputEnabled = settings.speechInputEnabled ?? false
  const defaultTab = settings.defaultTab ?? 'last'

  const hideGrades = workMode || noneMode
  const pluginTabIds = getAppTabs()
    .filter(pt => getAppById(pt.id)?.isEnabled(state))
    .map(pt => pt.id)
  const customNames = settings?.navbar?.customNames ?? {}
  const labelForTab = id => {
    const labelKey = getAppById(id)?.labelKey ?? id
    return customNames[id] || t[labelKey] || id
  }
  const defaultTabOptions = [
    { value: 'last', label: t.defaultTabLast },
    ...[...new Set([...CORE_TAB_IDS, ...pluginTabIds])]
      .filter(id => !(hideGrades && id === 'grades'))
      .filter(id => !CORE_TAB_IDS.includes(id) || id !== 'notes' || pluginTabIds.includes('notes'))
      .map(id => ({ value: id, label: labelForTab(id) })),
  ]

  return (
    <SettingList>
      <SettingRow label={t.themeColor} desc={t.themeColorDesc} control={
        <button type="button" onClick={() => updateSettings({ themeFontColor: null, themeBgColor: null, themeHighlightColor: null, themeDoneColor: null })}
          className="text-xs font-medium text-primary hover:underline">
          {t.themeColorReset}
        </button>
      }>
        <div className="grid grid-cols-2 gap-3">
          <ColorSwatch label={t.themeFontColor} value={settings.themeFontColor ?? '#3b5ea8'} onChange={hex => updateSettings({ themeFontColor: hex })} />
          <ColorSwatch label={t.themeHighlightColor} value={settings.themeHighlightColor ?? '#e8e6f0'} onChange={hex => updateSettings({ themeHighlightColor: hex })} />
          <ColorSwatch label={t.themeBgColor} value={settings.themeBgColor ?? '#fafaf9'} onChange={hex => updateSettings({ themeBgColor: hex })} />
          <ColorSwatch label={t.themeDoneColor} value={settings.themeDoneColor ?? '#22c55e'} onChange={hex => updateSettings({ themeDoneColor: hex })} />
        </div>
      </SettingRow>
      <SettingSelect label={t.defaultTabLabel} desc={t.defaultTabDesc} value={defaultTab}
        onChange={v => updateSettings({ defaultTab: v })} options={defaultTabOptions} />
      <SettingToggle label={t.speechInputLabel} desc={t.speechInputDesc} checked={speechInputEnabled}
        onChange={v => updateSettings({ speechInputEnabled: v })} />
      <SettingToggle label={t.semesterModeLabel} desc={t.semesterModeDesc} checked={noneMode}
        onChange={v => setSemesterMode(v ? 'none' : 'semesters')} />
      <SettingToggle label={t.workModeLabel} desc={t.workModeDesc} checked={workMode}
        onChange={v => updateSettings({ workMode: v })} />
      <WidgetSettings />
    </SettingList>
  )}
