import { Briefcase, CalendarRange, GraduationCap } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useStore } from '@/store/useStore'
import { ChoiceCard } from './ChoiceCard'
import { StepHeading } from './StepHeading'

export function ProfileStep({ t }) {
  const workMode = useStore(s => s.settings?.workMode ?? false)
  const noneMode = useStore(s => s.settings?.semesterMode === 'none')
  const updateSettings = useStore(s => s.updateSettings)
  const setSemesterMode = useStore(s => s.setSemesterMode)

  return (
    <div>
      <StepHeading title={t.obModeTitle} desc={t.obProfileDesc} />
      <div className="grid gap-3 sm:grid-cols-2">
        <ChoiceCard icon={GraduationCap} title={t.obProfileStudent} desc={t.obProfileStudentDesc}
          selected={!workMode} onClick={() => updateSettings({ workMode: false })} />
        <ChoiceCard icon={Briefcase} title={t.obModeWorkToggle} desc={t.obModeWorkToggleDesc}
          selected={workMode} onClick={() => updateSettings({ workMode: true })} />
      </div>
      <label className="mt-4 flex cursor-pointer items-center gap-3.5 rounded-2xl border border-dashed border-border p-4">
        <CalendarRange className="h-5 w-5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t.obModeWeeksToggle}</span>
          <span className="block text-xs leading-relaxed text-muted-foreground">{t.obModeWeeksToggleDesc}</span>
        </span>
        <Switch checked={noneMode} onCheckedChange={v => setSemesterMode(v ? 'none' : 'semesters')} />
      </label>
    </div>
  )
}
