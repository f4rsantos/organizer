import { useEffect, useState } from 'react'
import { ArrowLeft, Library, Loader2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { PRESET_GROUPS, checkPresetExists, fetchPreset, replaceWithPreset } from '@/lib/presets'
import { presetYearLabel, presetSemLabel } from '@/lib/presetLabels'
import { cn } from '@/lib/utils'

function groupByYear(keys, lang) {
  const years = new Map()
  for (const key of keys) {
    const year = presetYearLabel(key, lang)
    years.set(year, [...(years.get(year) ?? []), key])
  }
  return [...years.entries()]
}

function PresetPill({ presetKey, lang, available, checked, loading, onSelect }) {
  const isAvail = available[presetKey] ?? false
  const isLoading = loading === presetKey
  if (!checked) return <span className="h-10 animate-pulse rounded-xl bg-secondary" />

  return (
    <button type="button" onClick={() => onSelect(presetKey)} disabled={!isAvail || Boolean(loading)}
      className={cn(
        'flex h-10 items-center justify-center rounded-xl border text-sm font-medium transition-all duration-150',
        isAvail
          ? 'border-border bg-card hover:-translate-y-0.5 hover:border-primary hover:text-primary hover:shadow-sm active:translate-y-0'
          : 'border-dashed border-border/70 text-muted-foreground/50',
        loading && !isLoading && 'opacity-50',
        isLoading && 'border-primary text-primary',
      )}>
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : presetSemLabel(presetKey, lang)}
    </button>
  )
}

function PresetGroup({ title, keys, lang, pillProps }) {
  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
        {groupByYear(keys, lang).map(([year, yearKeys]) => (
          <div key={year} className="space-y-1.5">
            <p className="text-sm font-semibold">{year}</p>
            <div className="grid gap-1.5">
              {yearKeys.map(k => <PresetPill key={k} presetKey={k} lang={lang} {...pillProps} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function PresetPicker({ onBack, onLoaded }) {
  const lang = useStore(s => s.lang ?? 'pt')
  const t = useStrings(lang)
  const addSemester = useStore(s => s.addSemester)
  const addClass = useStore(s => s.addClass)
  const addHoliday = useStore(s => s.addHoliday)
  const setGradeComponents = useStore(s => s.setGradeComponents)
  const setTargetGrade = useStore(s => s.setTargetGrade)
  const addTask = useStore(s => s.addTask)
  const setPresetUpdatedAt = useStore(s => s.setPresetUpdatedAt)
  const deleteSemester = useStore(s => s.deleteSemester)

  const [available, setAvailable] = useState({})
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const all = [...PRESET_GROUPS.EI, ...PRESET_GROUPS.generic]
    Promise.allSettled(all.map(k => checkPresetExists(k).then(ok => [k, ok])))
      .then(results => {
        const map = {}
        results.forEach(r => { if (r.status === 'fulfilled') map[r.value[0]] = r.value[1] })
        setAvailable(map)
        setChecked(true)
      })
  }, [])

  const handleSelect = async key => {
    setLoading(key)
    setError(null)
    try {
      const data = await fetchPreset(key, setPresetUpdatedAt)
      const actions = {
        addSemester, addClass, addHoliday, setGradeComponents, setTargetGrade, addTask, deleteSemester,
        getState: useStore.getState, getClasses: () => useStore.getState().classes,
      }
      replaceWithPreset(data, actions, key)
      onLoaded()
    } catch {
      setError(t.presetError)
    } finally {
      setLoading(null)
    }
  }

  const pillProps = { available, checked, loading, onSelect: handleSelect }

  return (
    <div className="flex h-full min-h-full flex-col items-center justify-center overflow-y-auto px-6 py-12">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <button type="button" onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t.backToMenu}
        </button>

        <div className="space-y-2">
          <Library className="h-7 w-7 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">{t.loadPresetTitle}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{t.presetPickDesc}</p>
        </div>

        <PresetGroup title={t.presetGroupEI} keys={PRESET_GROUPS.EI} lang={lang} pillProps={pillProps} />
        <PresetGroup title={t.presetGroupGeneric} keys={PRESET_GROUPS.generic} lang={lang} pillProps={pillProps} />

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
