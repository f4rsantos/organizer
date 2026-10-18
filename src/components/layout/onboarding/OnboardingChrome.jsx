import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STEP_LABEL_KEYS = {
  profile: 'obStepProfile',
  dates: 'obStepDates',
  classes: 'obStepClasses',
  tour: 'obStepTour',
  apps: 'obStepApps',
  ready: 'obStepReady',
}

function segmentTone(stepIndex, index) {
  if (stepIndex < index) return 'bg-primary/35'
  if (stepIndex === index) return 'bg-primary'
  return 'bg-transparent'
}

function OnboardingProgress({ t, steps, index, onJump }) {
  const tracked = steps.filter(step => STEP_LABEL_KEYS[step])
  if (tracked.length < 2) return null
  const offset = steps.length - tracked.length

  return (
    <div className="w-full">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-border/70">
        {tracked.map((step, i) => (
          <span key={step} className={cn('h-full flex-1 transition-colors duration-500', segmentTone(i + offset, index))} />
        ))}
      </div>
      <ol className="mt-2 hidden sm:flex">
        {tracked.map((step, i) => {
          const stepIndex = i + offset
          const done = stepIndex < index
          return (
            <li key={step} className="flex-1 text-center">
              <button type="button" disabled={!done} onClick={() => onJump(stepIndex)}
                className={cn('text-[11px] transition-colors disabled:cursor-default',
                  stepIndex === index ? 'font-semibold text-primary' : 'text-muted-foreground',
                  done && 'hover:text-foreground')}>
                {t[STEP_LABEL_KEYS[step]]}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function OnboardingHeader({ t, steps, index, onJump, action }) {
  return (
    <header className="mx-auto grid w-full max-w-3xl grid-cols-[1fr_minmax(0,28rem)_1fr] items-start gap-3 px-5 pt-2-safe">
      <span />
      <div className="pt-5">
        <OnboardingProgress t={t} steps={steps} index={index} onJump={onJump} />
      </div>
      <div className="flex justify-end pt-3.5">
        {action && (
          <button type="button" onClick={action.onClick}
            className="whitespace-nowrap text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            {action.label}
          </button>
        )}
      </div>
    </header>
  )
}

export function OnboardingFooter({ t, isLast, blockedHint, onBack, onNext }) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-border/60 bg-background/80 backdrop-blur pb-safe">
      <div className="mx-auto flex w-full max-w-xl items-center gap-2 px-5 py-3">
        <Button variant="ghost" className="gap-1.5" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> {t.obBack}
        </Button>
        <p className="min-w-0 flex-1 truncate text-center text-xs text-muted-foreground">{blockedHint}</p>
        <Button className="gap-1.5 px-5" onClick={onNext} disabled={Boolean(blockedHint)}>
          {isLast ? t.obOpenApp : t.obNext}
          {!isLast && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
