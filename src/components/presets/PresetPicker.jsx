import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { PRESET_GROUPS, checkPresetExists, fetchPreset, applyPreset } from '@/lib/presets'

const YEAR_LABEL = {
  en: { '1a': '1st Year', '2a': '2nd Year', '3a': '3rd Year', s: 'General' },
  pt: { '1a': '1º Ano',   '2a': '2º Ano',   '3a': '3º Ano',   s: 'Geral'   },
}
const SEM_LABEL = {
  en: { '1s': '1st Sem', '2s': '2nd Sem', s1: '1st Sem', s2: '2nd Sem' },
  pt: { '1s': '1º Sem',  '2s': '2º Sem',  s1: '1º Sem',  s2: '2º Sem'  },
}

function yearKey(k) { return k === 's1' || k === 's2' ? 's' : k.slice(0, 2) }
function semKey(k)  { return k === 's1' ? 's1' : k === 's2' ? 's2' : k.slice(2) }

function PresetCard({ presetKey, available, checked, loading, onSelect, lang }) {
  const isAvail   = available[presetKey] ?? false
  const isLoading = loading === presetKey
  const busy      = !!loading && !isLoading
  const faded     = checked && !isAvail

  const year = (YEAR_LABEL[lang] ?? YEAR_LABEL.en)[yearKey(presetKey)]
  const sem  = (SEM_LABEL[lang]  ?? SEM_LABEL.en)[semKey(presetKey)]

  return (
    <button
      onClick={() => isAvail && !loading && onSelect(presetKey)}
      disabled={faded || busy}
      className={[
        'relative flex flex-col items-center justify-center gap-1 rounded-xl border py-6 px-4 text-center transition-all duration-150',
        faded  ? 'opacity-30 cursor-not-allowed border-border/30 bg-transparent' :
        busy   ? 'opacity-50 cursor-wait border-border bg-card' :
                 'border-border bg-card hover:bg-accent hover:border-accent-foreground/20 active:scale-[0.97] cursor-pointer',
      ].join(' ')}
    >
      {isLoading
        ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        : <>
            <span className="text-sm font-medium">{year}</span>
            <span className="text-xs text-muted-foreground">{sem}</span>
          </>
      }
    </button>
  )
}

export function PresetPicker({ onBack, onLoaded }) {
  const lang               = useStore(s => s.lang ?? 'pt')
  const t                  = useStrings(lang)
  const addSemester        = useStore(s => s.addSemester)
  const addClass           = useStore(s => s.addClass)
  const addHoliday         = useStore(s => s.addHoliday)
  const setGradeComponents = useStore(s => s.setGradeComponents)
  const setTargetGrade     = useStore(s => s.setTargetGrade)
  const addTask            = useStore(s => s.addTask)
  const getClasses         = () => useStore.getState().classes

  const [available, setAvailable] = useState({})
  const [checked,   setChecked]   = useState(false)
  const [loading,   setLoading]   = useState(null)
  const [error,     setError]     = useState(null)

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

  const handleSelect = async (key) => {
    setLoading(key)
    setError(null)
    try {
      const data    = await fetchPreset(key)
      const actions = { addSemester, addClass, addHoliday, setGradeComponents, setTargetGrade, addTask, getClasses }
      applyPreset(data, actions, key)
      onLoaded()
    } catch {
      setError(t.presetError)
    } finally {
      setLoading(null)
    }
  }

  const cardProps = { available, checked, loading, onSelect: handleSelect, lang }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 px-8 py-16">
      <div className="w-full max-w-xs space-y-8">

        <button onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> {t.backToMenu}
        </button>

        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">{t.loadPresetTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {lang === 'pt' ? 'Escolhe o teu semestre.' : 'Pick your semester.'}
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground tracking-widest uppercase">{t.presetGroupEI}</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_GROUPS.EI.map(k => <PresetCard key={k} presetKey={k} {...cardProps} />)}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground tracking-widest uppercase">{t.presetGroupGeneric}</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_GROUPS.generic.map(k => <PresetCard key={k} presetKey={k} {...cardProps} />)}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
