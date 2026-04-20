import { useState } from 'react'
import { Briefcase, Circle, CircleCheck, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LangToggle } from '@/components/common/LangToggle'
import { PresetPicker } from '@/components/presets/PresetPicker'
import { FirebaseGuideModal } from '@/components/settings/FirebaseSyncPanel'
import { loadFirebaseConfig } from '@/lib/firebase'

export function Onboarding({ onDone }) {
  const lang = useStore(s => s.lang ?? 'pt')
  const t = useStrings(lang)
  const workMode = useStore(s => s.settings?.workMode ?? false)
  const updateSettings = useStore(s => s.updateSettings)
  const [view, setView] = useState('main')
  const [showFirebaseGuide, setShowFirebaseGuide] = useState(false)
  const firebaseConnected = !!loadFirebaseConfig()

  if (view === 'presets') {
    return <PresetPicker onBack={() => setView('main')} onLoaded={onDone} />
  }

  const steps = [t.step1, t.step2, t.step3]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-8 text-center">
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <LangToggle />
        <ThemeToggle />
      </div>

      <div className="space-y-3">
        <GraduationCap className="mx-auto h-12 w-12 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">{t.welcomeTitle}</h1>
        <p className="text-muted-foreground leading-relaxed max-w-xs">{t.welcomeDesc}</p>
      </div>

      <div className="w-full max-w-xs space-y-3 text-left text-sm text-muted-foreground">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-medium">
              {i + 1}
            </span>
            {step}
          </div>
        ))}
      </div>

      <div className="w-full max-w-xs space-y-2">
        <button type="button"
          onClick={() => updateSettings({ workMode: !workMode })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center">
          {workMode
            ? <CircleCheck className="h-4 w-4 text-primary" />
            : <Circle className="h-4 w-4" />}
          <Briefcase className="h-4 w-4" />
          {t.workModeOnboarding}
        </button>
        <Button size="lg" className="w-full" onClick={() => setView('presets')}>
          {t.loadPreset}
        </Button>
        {!firebaseConnected && (
          <Button variant="outline" size="lg" className="w-full" onClick={() => setShowFirebaseGuide(true)}>
            {t.importFromFirebase}
          </Button>
        )}
        <Button variant="ghost" size="lg" className="w-full" onClick={onDone}>
          {t.getStarted}
        </Button>
      </div>
      {showFirebaseGuide && <FirebaseGuideModal onClose={() => setShowFirebaseGuide(false)} syncStatus="idle" />}
    </div>
  )
}
