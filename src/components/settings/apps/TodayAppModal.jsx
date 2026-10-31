import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { useTodaySettings } from '@/apps/today/useTodaySettings'
import { HEADLINE_COUNTS } from '@/lib/today/todaySettings'
import { SettingList, SettingRow, SettingSelect, SettingToggle } from '../SettingRow'

const SECTION_TOGGLES = [
  { key: 'showOnOpen', labelKey: 'todaySettingsShowOnOpen' },
  { key: 'showWeather', labelKey: 'todayShowWeather', descKey: 'todayShowWeatherDesc' },
  { key: 'showMotivation', labelKey: 'todayShowMotivation', descKey: 'todayShowMotivationDesc' },
  { key: 'showNotes', labelKey: 'todayNotesTitle', descKey: 'todayShowNotesDesc' },
  { key: 'showSchedule', labelKey: 'todayScheduleTitle' },
  { key: 'showUpcoming', labelKey: 'todayUpcomingTitle' },
]

const SOURCE_TOGGLES = [
  { key: 'exams', labelKey: 'todayKindExam' },
  { key: 'events', labelKey: 'todayKindEvent' },
  { key: 'tasks', labelKey: 'todayKindTask' },
  { key: 'cards', labelKey: 'todayKindCard' },
]

const RECOMMEND_TOGGLES = [
  { key: 'study', labelKey: 'todayPrefStudy' },
  { key: 'tasks', labelKey: 'todayPrefTasks' },
  { key: 'kanban', labelKey: 'todayPrefKanban' },
  { key: 'rest', labelKey: 'todayPrefRest' },
]

function NameSetting({ t, name, onSave }) {
  const [draft, setDraft] = useState(name)
  useEffect(() => { setDraft(name) }, [name])
  return (
    <SettingRow label={t.todaySettingsName} desc={t.todaySettingsNameDesc} control={
      <Input className="h-8 w-40" value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={() => onSave(draft.trim())} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />
    } />
  )
}

export function TodayAppModal({ open, onOpenChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const settings = useTodaySettings()
  const updateSettings = useStore(s => s.updateSettings)
  const save = patch => updateSettings({ todayBrief: { ...settings, ...patch } })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.todayBrief}</DialogTitle>
        </DialogHeader>
        <SettingList>
          <NameSetting t={t} name={settings.name} onSave={name => save({ name })} />
          <SettingSelect label={t.todaySettingsHeadlineCount} desc={t.todaySettingsHeadlineCountDesc}
            value={String(settings.headlineCount)} onChange={value => save({ headlineCount: Number(value) })}
            options={HEADLINE_COUNTS.map(count => ({ value: String(count), label: String(count) }))} />
          {SECTION_TOGGLES.map(toggle => (
            <SettingToggle key={toggle.key} label={t[toggle.labelKey]} desc={toggle.descKey ? t[toggle.descKey] : undefined}
              checked={settings[toggle.key]} onChange={value => save({ [toggle.key]: value })} />
          ))}
        </SettingList>
        <p className="pt-2 text-xs font-medium text-muted-foreground">{t.todaySettingsSources}</p>
        <SettingList>
          {SOURCE_TOGGLES.map(toggle => (
            <SettingToggle key={toggle.key} label={t[toggle.labelKey]} checked={settings.highlightSources[toggle.key]}
              onChange={value => save({ highlightSources: { ...settings.highlightSources, [toggle.key]: value } })} />
          ))}
        </SettingList>
        <p className="pt-2 text-xs font-medium text-muted-foreground">{t.todaySettingsRecommend}</p>
        <SettingList>
          {RECOMMEND_TOGGLES.map(toggle => (
            <SettingToggle key={toggle.key} label={t[toggle.labelKey]} checked={settings.recommend[toggle.key]}
              onChange={value => save({ recommend: { ...settings.recommend, [toggle.key]: value } })} />
          ))}
        </SettingList>
      </DialogContent>
    </Dialog>
  )
}
