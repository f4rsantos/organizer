import { CloudDownload, Sparkles } from 'lucide-react'
import { LangToggle } from '@/components/common/LangToggle'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { AppMark } from './AppMark'
import { ChoiceCard } from './ChoiceCard'

export function WelcomeStep({ t, onChoosePath }) {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <AppMark className="h-16 w-16 animate-in zoom-in-75 fade-in duration-700" />
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.obWelcomeTitle}</h1>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">{t.obWelcomeDesc}</p>
      </div>
      <div className="flex items-center gap-1">
        <LangToggle />
        <span className="h-4 w-px bg-border" />
        <ThemeToggle />
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-2">
        <ChoiceCard emphasis icon={Sparkles} title={t.obStartFresh} desc={t.obStartFreshDesc}
          onClick={() => onChoosePath('fresh')} />
        <ChoiceCard icon={CloudDownload} title={t.obRestore} desc={t.obRestoreDesc}
          onClick={() => onChoosePath('restore')} />
      </div>
    </div>
  )
}
