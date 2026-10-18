import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { ClassColorDot } from '@/components/settings/ClassColorDot'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { ScheduleImportPanel } from './ScheduleImportPanel'
import { geocodeCity } from '@/lib/weather'
import { SettingList, SettingRow, SettingSelect, SettingToggle } from './SettingRow'

const DEFAULT_NOW_COLOR = '#ef4444'

const WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6]

function weekStartOptions(t) {
  return WEEK_DAYS.map(dow => ({ value: String(dow), label: t.weekdays[(dow + 6) % 7] }))
}

function WeatherCitySetting({ t }) {
  const enabled = useStore(s => s.settings?.weatherEnabled ?? false)
  const savedCity = useStore(s => s.settings?.weatherCity ?? '')
  const coords = useStore(s => s.settings?.weatherCoords ?? null)
  const updateSettings = useStore(s => s.updateSettings)
  const [input, setInput] = useState(savedCity)
  const [status, setStatus] = useState('idle')

  useEffect(() => { setInput(savedCity) }, [savedCity])

  const save = async () => {
    const city = input.trim()
    if (city === savedCity) return
    if (!city) {
      updateSettings({ weatherCity: '', weatherCoords: null })
      setStatus('idle')
      return
    }
    setStatus('loading')
    try {
      const geo = await geocodeCity(city)
      if (!geo) { setStatus('error'); return }
      updateSettings({ weatherCity: city, weatherCoords: { lat: geo.lat, lon: geo.lon, city } })
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  return (
    <SettingToggle label={t.weatherPreview} desc={t.weatherPreviewDesc} checked={enabled}
      onChange={v => updateSettings({ weatherEnabled: v })}>
      {enabled && (
        <div className="space-y-1.5">
          <Input value={input} onChange={e => setInput(e.target.value)}
            onBlur={save} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            placeholder={t.weatherCityPlaceholder} />
          {status === 'loading' && <p className="text-xs text-muted-foreground">{t.weatherCityLoading}</p>}
          {status === 'error' && <p className="text-xs text-destructive">{t.weatherCityError}</p>}
          {status === 'ok' && coords && <p className="text-xs text-muted-foreground">{t.weatherCitySaved}</p>}
        </div>
      )}
    </SettingToggle>
  )}

export function CalendarSettings({ semesterId, semesterStart, semesterEnd }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const nowColor = useStore(s => s.settings?.calendarNowColor ?? DEFAULT_NOW_COLOR)
  const weekStartsOn = useStore(s => s.settings?.weekStartsOn ?? 1)
  const updateSettings = useStore(s => s.updateSettings)

  return (
    <SettingList>
      <SettingRow label={t.calendarNowColor} desc={t.calendarNowColorDesc} control={
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => updateSettings({ calendarNowColor: null })}
            className="text-xs font-medium text-primary hover:underline">
            {t.themeColorReset}
          </button>
          <ClassColorDot compact color={nowColor} onChange={hex => updateSettings({ calendarNowColor: hex })} />
        </div>
      } />
      <SettingSelect label={t.weekStartDay} value={String(weekStartsOn)}
        onChange={v => updateSettings({ weekStartsOn: Number(v) })} options={weekStartOptions(t)} />
      <WeatherCitySetting t={t} />
      <SettingRow label={t.scheduleImportTitle}>
        <ScheduleImportPanel semesterId={semesterId} semesterStart={semesterStart} semesterEnd={semesterEnd} />
      </SettingRow>
    </SettingList>
  )}
