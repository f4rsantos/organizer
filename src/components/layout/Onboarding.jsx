import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'
import { onboardingSteps, stepBlocker } from '@/lib/onboarding/steps'
import { PresetPicker } from '@/components/presets/PresetPicker'
import { OnboardingFooter, OnboardingHeader } from './onboarding/OnboardingChrome'
import { WelcomeStep } from './onboarding/WelcomeStep'
import { RestoreStep } from './onboarding/RestoreStep'
import { ProfileStep } from './onboarding/ProfileStep'
import { DatesStep } from './onboarding/DatesStep'
import { ClassesStep } from './onboarding/ClassesStep'
import { AppsStep } from './onboarding/AppsStep'
import { TourStep } from './onboarding/TourStep'
import { ReadyStep } from './onboarding/ReadyStep'
import './onboarding/tour.css'

const STEP_VIEWS = {
  welcome: WelcomeStep,
  restore: RestoreStep,
  profile: ProfileStep,
  dates: DatesStep,
  classes: ClassesStep,
  apps: AppsStep,
  tour: TourStep,
  ready: ReadyStep,
}

const BLOCKER_HINT_KEYS = { needsDates: 'obDatesNeeded' }

function isTypingTarget(target) {
  return Boolean(target?.closest?.('input, textarea, select, button, a, [contenteditable], [role="listbox"]'))
}

function headerActionFor({ path, current, isLast, t, onDone, onBack }) {
  if (current === 'restore') return { label: t.obBack, onClick: onBack }
  if (path === 'fresh' && !isLast) return { label: t.obSkipSetup, onClick: onDone }
  return null
}

const BRAND_THEME = {
  '--primary': '#16a34a',
  '--primary-foreground': '#ffffff',
  '--ring': 'color-mix(in oklab, #16a34a 60%, transparent)',
}

export function Onboarding({ onDone, onSyncRestored }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const noneMode = useStore(s => s.settings?.semesterMode === 'none')
  const semesters = useStore(s => s.semesters)
  const activeSemesterId = useStore(s => s.activeSemesterId)

  const [path, setPath] = useState(null)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [showPresets, setShowPresets] = useState(false)

  const steps = onboardingSteps({ path, noneMode })
  const safeIndex = Math.min(index, steps.length - 1)
  const current = steps[safeIndex]
  const blocker = stepBlocker(current, { noneMode, semesters, activeSemesterId })
  const isLast = safeIndex === steps.length - 1
  const showFooter = current !== 'welcome' && current !== 'restore'

  const goTo = target => {
    setDirection(target >= safeIndex ? 1 : -1)
    setIndex(target)
  }

  const next = () => {
    if (blocker) return
    if (isLast) { onDone(); return }
    goTo(safeIndex + 1)
  }

  const back = () => goTo(Math.max(0, safeIndex - 1))

  const choosePath = choice => {
    setPath(choice)
    setDirection(1)
    setIndex(1)
  }

  const afterPreset = () => {
    setShowPresets(false)
    const classesIndex = onboardingSteps({ path: 'fresh', noneMode: false }).indexOf('classes')
    setDirection(1)
    setIndex(classesIndex)
  }

  const nextRef = useRef(next)
  useEffect(() => { nextRef.current = next })

  useEffect(() => {
    if (!showFooter) return
    const onKey = e => {
      if (e.key !== 'Enter' || e.shiftKey || isTypingTarget(e.target)) return
      e.preventDefault()
      nextRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showFooter])

  if (showPresets) {
    return (
      <div className="h-full" style={BRAND_THEME}>
        <PresetPicker onBack={() => setShowPresets(false)} onLoaded={afterPreset} />
      </div>
    )
  }

  const View = STEP_VIEWS[current]
  const headerAction = headerActionFor({ path, current, isLast, t, onDone, onBack: back })

  return (
    <div className="h-full overflow-y-auto" style={BRAND_THEME}>
      <div className="flex min-h-full flex-col">
        <OnboardingHeader t={t} steps={steps} index={safeIndex} onJump={goTo}
          action={headerAction} />
        <main className="flex flex-1 flex-col items-center justify-center px-5 py-8">
          <div key={current} className={cn('w-full max-w-xl animate-in fade-in duration-300',
            direction > 0 ? 'slide-in-from-right-6' : 'slide-in-from-left-6')}>
            <View t={t} onChoosePath={choosePath} onDone={onDone} onSyncRestored={onSyncRestored}
              onPresets={() => setShowPresets(true)} />
          </div>
        </main>
        {showFooter && (
          <OnboardingFooter t={t} isLast={isLast} onBack={back} onNext={next}
            blockedHint={blocker ? t[BLOCKER_HINT_KEYS[blocker]] : null} />
        )}
      </div>
    </div>
  )
}
