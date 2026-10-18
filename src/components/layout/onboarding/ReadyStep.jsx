import { Briefcase, CalendarRange, GraduationCap, Users } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { APP_PLUGINS } from '@/apps/registry'
import { AppMark } from './AppMark'

const CHIP_STAGGER_MS = 70
const CHIP_START_MS = 350

function useSummaryChips(t) {
  const state = useStore(s => s)
  const workMode = state.settings?.workMode ?? false
  const noneMode = state.settings?.semesterMode === 'none'
  const scopeId = noneMode ? null : state.activeSemesterId
  const semester = state.semesters.find(s => s.id === state.activeSemesterId)
  const groupCount = state.classes.filter(c => c.semesterId === scopeId).length
  const apps = APP_PLUGINS.filter(p => p.isEnabled(state) && (!p.isVisible || p.isVisible(state)))
  return [
    { id: 'profile', icon: workMode ? Briefcase : GraduationCap, label: workMode ? t.obModeWorkToggle : t.obProfileStudent },
    { id: 'period', icon: CalendarRange, label: noneMode ? t.obModeWeeksToggle : semester?.name },
    groupCount > 0 && { id: 'groups', icon: Users, label: workMode ? t.obSummaryGroups(groupCount) : t.obSummaryClasses(groupCount) },
    ...apps.map(app => ({ id: app.id, icon: app.icon, label: t[app.labelKey] })),
  ].filter(chip => chip && chip.label)
}

export function ReadyStep({ t }) {
  const chips = useSummaryChips(t)

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <AppMark className="h-20 w-20 animate-in zoom-in-50 fade-in duration-700" />
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.obReadyTitle}</h1>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">{t.obReadyDesc}</p>
      </div>
      <ul className="flex max-w-md flex-wrap justify-center gap-2">
        {chips.map(({ id, icon: Icon, label }, i) => (
          <li key={id} style={{ animationDelay: `${CHIP_START_MS + i * CHIP_STAGGER_MS}ms` }}
            className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500">
            <Icon className="h-3.5 w-3.5 text-primary" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
