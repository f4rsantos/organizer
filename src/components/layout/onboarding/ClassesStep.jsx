import { useStore } from '@/store/useStore'
import { ClassesForm } from '@/components/settings/ClassesForm'
import { StepHeading } from './StepHeading'

export function ClassesStep({ t }) {
  const workMode = useStore(s => s.settings?.workMode ?? false)
  const noneMode = useStore(s => s.settings?.semesterMode === 'none')
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const classes = useStore(s => s.classes)
  const scopeId = noneMode ? null : activeSemesterId
  const scoped = classes.filter(c => c.semesterId === scopeId)

  return (
    <div>
      <StepHeading
        title={workMode ? t.obGroupsTitle : t.obClassesTitle}
        desc={workMode ? t.obGroupsDesc : t.obClassesDesc} />
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <ClassesForm semesterId={scopeId} classes={scoped} workMode={workMode} />
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">{t.obOptionalHint}</p>
    </div>
  )
}
