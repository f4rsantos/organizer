import { Circle, CircleCheck, Plus, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClassColorDot } from '@/components/settings/ClassColorDot'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { getAppById, getAppTabs } from '@/apps/registry'

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
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>{t.themeColor}</Label>
            <button onClick={() => updateSettings({ themeFontColor: null, themeBgColor: null, themeHighlightColor: null })} className="text-xs text-primary hover:underline">
              {t.themeColorReset}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{t.themeColorDesc}</p>
          <div className="pt-2 flex flex-col gap-3">
            <ColorSwatch
              key={`font-${settings.themeFontColor ?? ''}`}
              label={t.themeFontColor}
              value={settings.themeFontColor ?? '#3b5ea8'}
              onChange={hex => updateSettings({ themeFontColor: hex })}
            />
            <ColorSwatch
              key={`highlight-${settings.themeHighlightColor ?? ''}`}
              label={t.themeHighlightColor}
              value={settings.themeHighlightColor ?? '#e8e6f0'}
              onChange={hex => updateSettings({ themeHighlightColor: hex })}
            />
            <ColorSwatch
              key={`bg-${settings.themeBgColor ?? ''}`}
              label={t.themeBgColor}
              value={settings.themeBgColor ?? '#fafaf9'}
              onChange={hex => updateSettings({ themeBgColor: hex })}
            />
          </div>
        </div>
      </div>
      

      <div className="space-y-1.5">
        <Label>{t.defaultTabLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.defaultTabDesc}</p>
        <Select value={defaultTab} onValueChange={v => updateSettings({ defaultTab: v })} items={defaultTabOptions}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {defaultTabOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>


      <div className="space-y-1.5">
        <Label>{t.speechInputLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.speechInputDesc}</p>
        <button type="button" onClick={() => updateSettings({ speechInputEnabled: !speechInputEnabled })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {speechInputEnabled
            ? <CircleCheck className="h-4 w-4 text-primary" />
            : <Circle className="h-4 w-4" />}
          {speechInputEnabled ? t.settingEnabled : t.settingDisabled}
        </button>
      </div>

      <div className="space-y-1.5">
        <Label>{t.semesterModeLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.semesterModeDesc}</p>
        <button type="button" onClick={() => setSemesterMode(noneMode ? 'semesters' : 'none')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {noneMode
            ? <CircleCheck className="h-4 w-4 text-primary" />
            : <Circle className="h-4 w-4" />}
          {noneMode ? t.semesterModeNone : t.semesterModeSemesters}
        </button>
      </div>

      <div className="space-y-1.5">
        <Label>{t.workModeLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.workModeDesc}</p>
        <button type="button" onClick={() => updateSettings({ workMode: !workMode })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {workMode
            ? <CircleCheck className="h-4 w-4 text-primary" />
            : <Circle className="h-4 w-4" />}
          {workMode ? t.settingEnabled : t.settingDisabled}
        </button>
      </div>
    </div>
  )
}
