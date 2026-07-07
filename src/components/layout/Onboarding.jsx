import { useMemo, useRef, useState } from 'react'
import { Briefcase, CalendarRange, CheckCircle2, Upload, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LangToggle } from '@/components/common/LangToggle'
import { PresetPicker } from '@/components/presets/PresetPicker'
import { FirebaseGuideModal } from '@/components/settings/FirebaseSyncPanel'
import { SemesterDatesForm } from '@/components/settings/SemesterDatesForm'
import { ClassesForm } from '@/components/settings/ClassesForm'
import { importState } from '@/store/persist'

function ToggleRow({ icon: Icon, title, desc, checked, onChange }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-4">
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function StepInfo({ title, desc, icon: Icon }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <Icon className="h-12 w-12 text-primary" />
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-xs">{desc}</p>
    </div>
  )
}

export function Onboarding({ onDone }) {
  const lang = useStore(s => s.lang ?? 'pt')
  const t = useStrings(lang)
  const updateSettings = useStore(s => s.updateSettings)
  const importData = useStore(s => s.importData)
  const workMode = useStore(s => s.settings?.workMode ?? false)
  const noneMode = useStore(s => s.settings?.semesterMode === 'none')
  const semesters = useStore(s => s.semesters)
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const classes = useStore(s => s.classes)

  const [step, setStep] = useState(0)
  const [showPresets, setShowPresets] = useState(false)
  const [showFirebaseGuide, setShowFirebaseGuide] = useState(false)
  const [importError, setImportError] = useState(null)
  const fileRef = useRef(null)

  const steps = useMemo(() => {
    if (noneMode) return ['welcome', 'mode', 'classes', 'info-tasks', 'info-cal', 'info-done']
    return ['welcome', 'mode', 'dates', 'classes', 'info-tasks', 'info-cal', 'info-done']
  }, [noneMode])

  const current = steps[step]
  const scopeId = noneMode ? null : activeSemesterId
  const scopedClasses = classes.filter(c => c.semesterId === scopeId)
  const datesReady = noneMode || (semesters.length > 0 && activeSemesterId)
  const nextDisabled = current === 'dates' && !datesReady

  const next = () => setStep(s => Math.min(steps.length - 1, s + 1))
  const back = () => setStep(s => Math.max(0, s - 1))

  const handleImport = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    try { setImportError(null); importData(await importState(file)); onDone() }
    catch { setImportError(lang === 'pt' ? 'Ficheiro inválido.' : 'Invalid file.') }
    e.target.value = ''
  }

  if (showPresets) return <PresetPicker onBack={() => setShowPresets(false)} onLoaded={onDone} />

  const titles = {
    welcome: [t.obWelcomeTitle, t.obWelcomeDesc],
    mode: [t.obModeTitle, t.obModeDesc],
    dates: [t.obDatesTitle, t.obDatesDesc],
    classes: workMode ? [t.obGroupsTitle, t.obGroupsDesc] : [t.obClassesTitle, t.obClassesDesc],
  }

  return (
    <div className="flex min-h-screen flex-col px-6 py-8 max-w-md mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-border'}`} />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center py-6">
        {titles[current] && (
          <div className="mb-5 text-center">
            <h1 className="text-xl font-semibold">{titles[current][0]}</h1>
            <p className="text-sm text-muted-foreground">{titles[current][1]}</p>
          </div>
        )}

        {current === 'welcome' && (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card border border-border shadow-sm">
              <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="#22c55e"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-2">
              <LangToggle />
              <span className="h-4 w-px bg-border" />
              <ThemeToggle />
            </div>
          </div>
        )}

        {current === 'mode' && (
          <div className="space-y-3">
            <ToggleRow icon={Briefcase} title={t.obModeWorkToggle} desc={t.obModeWorkToggleDesc}
              checked={workMode} onChange={v => updateSettings({ workMode: v })} />
            <ToggleRow icon={CalendarRange} title={t.obModeWeeksToggle} desc={t.obModeWeeksToggleDesc}
              checked={noneMode} onChange={v => updateSettings({ semesterMode: v ? 'none' : 'semesters' })} />
          </div>
        )}

        {current === 'dates' && (
          <div className="space-y-4">
            {semesters.length > 0
              ? <div className="rounded-lg bg-secondary/60 px-3 py-2.5 text-sm">
                  {semesters.find(s => s.id === activeSemesterId)?.name}
                </div>
              : <SemesterDatesForm />}
            <Button variant="ghost" className="w-full" onClick={() => setShowPresets(true)}>{t.loadPreset}</Button>
            <div className="pt-1">
              <p className="text-center text-xs text-muted-foreground mb-2">{t.obImportOr}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2" onClick={() => setShowFirebaseGuide(true)}>
                  <Cloud className="h-4 w-4" /> {t.importFromFirebase}
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" /> {t.importJson}
                </Button>
              </div>
              {importError && <p className="text-xs text-destructive mt-2">{importError}</p>}
            </div>
          </div>
        )}

        {current === 'classes' && (
          <ClassesForm semesterId={scopeId} classes={scopedClasses} workMode={workMode} />
        )}

        {current === 'info-tasks' && <StepInfo icon={CalendarRange} title={t.obInfoTasksTitle} desc={t.obInfoTasksDesc} />}
        {current === 'info-cal' && <StepInfo icon={CalendarRange} title={t.obInfoCalTitle} desc={t.obInfoCalDesc} />}
        {current === 'info-done' && <StepInfo icon={CheckCircle2} title={t.obInfoDoneTitle} desc={t.obInfoDoneDesc} />}
      </div>

      <div className="flex items-center gap-2">
        {step > 0 && <Button variant="outline" className="flex-1" onClick={back}>{t.obBack}</Button>}
        {step < steps.length - 1
          ? <Button className="flex-1" onClick={next} disabled={nextDisabled}>{t.obNext}</Button>
          : <Button className="flex-1" onClick={onDone}>{t.obFinish}</Button>}
      </div>

      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      {showFirebaseGuide && <FirebaseGuideModal onClose={() => setShowFirebaseGuide(false)} syncStatus="idle" />}
    </div>
  )
}
