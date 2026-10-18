import { useState } from 'react'
import { CheckCircle2, Library } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/store/useStore'
import { computeWeekCount } from '@/lib/semesterUtils'
import { semesterDraftStatus, semesterFromDraft, suggestSemesterName } from '@/lib/onboarding/semesterDraft'
import { ChoiceCard } from './ChoiceCard'
import { StepHeading } from './StepHeading'

function draftOf(semester) {
  return {
    name: semester?.name ?? '',
    startDate: semester?.startDate ?? '',
    endDate: semester?.endDate ?? '',
  }
}

function DraftHint({ t, status, weekCount }) {
  if (status === 'endBeforeStart') return <p className="text-xs text-destructive">{t.obDatesEndBeforeStart}</p>
  if (status !== 'ready') return null
  return (
    <p className="flex items-center gap-1.5 text-xs text-primary">
      <CheckCircle2 className="h-3.5 w-3.5" /> {t.obDatesSaved} · {t.weeks(weekCount)}
    </p>
  )
}

export function DatesStep({ t, onPresets }) {
  const semesters = useStore(s => s.semesters)
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const addSemester = useStore(s => s.addSemester)
  const updateSemester = useStore(s => s.updateSemester)
  const active = semesters.find(s => s.id === activeSemesterId) ?? null
  const [draft, setDraft] = useState(() => draftOf(active))
  const status = semesterDraftStatus(draft)

  const change = patch => {
    const next = { ...draft, ...patch }
    setDraft(next)
    if (semesterDraftStatus(next) !== 'ready') return
    const semester = semesterFromDraft(next)
    if (active) updateSemester(active.id, semester)
    else addSemester(semester)
  }

  const weekCount = status === 'ready' ? computeWeekCount(draft.startDate, draft.endDate) : null

  return (
    <div>
      <StepHeading title={t.obDatesTitle} desc={t.obDatesDesc} />
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0 space-y-1.5">
            <Label>{t.startDate}</Label>
            <Input type="date" value={draft.startDate} onChange={e => change({ startDate: e.target.value })} />
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label>{t.endDate}</Label>
            <Input type="date" value={draft.endDate} min={draft.startDate || undefined}
              onChange={e => change({ endDate: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t.semesterName}</Label>
          <Input value={draft.name} placeholder={suggestSemesterName(draft.startDate) || 'e.g. 2026/27 S1'}
            onChange={e => change({ name: e.target.value })} />
        </div>
        <DraftHint t={t} status={status} weekCount={weekCount} />
      </div>
      <div className="mt-3">
        <ChoiceCard icon={Library} title={t.obPresetCardTitle} desc={t.obPresetCardDesc} onClick={onPresets} />
      </div>
    </div>
  )
}
