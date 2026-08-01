import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { getNextPresetKey, transitionSemester } from '@/lib/presets'
import { presetFullLabel } from '@/lib/presetLabels'
import { CARRY_KEYS, countCarryCandidates } from '@/lib/semesterTransition'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const CARRY_LABEL_KEY = {
  kanban: 'carryKanbanCards',
  tasks: 'carryUpcomingTasks',
  events: 'carryUpcomingEvents',
}

export function NextSemesterDialog() {
  const semesters = useStore(s => s.semesters)
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const dismissed = useStore(s => s.dismissedNextSemester ?? {})
  const dismissNextSemester = useStore(s => s.dismissNextSemester)
  const lang = useStore(s => s.lang ?? 'pt')
  const t = useStrings(lang)

  const tasks = useStore(s => s.tasks)
  const events = useStore(s => s.events)

  const [carry, setCarry] = useState({ kanban: true, tasks: true, events: true })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const sem = semesters.find(s => s.id === activeSemesterId)
  const nextKey = sem?.presetKey ? getNextPresetKey(sem.presetKey, sem.previousPresetKey) : null

  const counts = sem?.endDate ? countCarryCandidates({ tasks, events }, sem.id, sem.endDate) : null

  if (!sem?.endDate || !sem?.presetKey) return null

  const ended = new Date(sem.endDate) < new Date()
  if (!ended || !nextKey || dismissed[activeSemesterId]) return null

  const handleTransition = async () => {
    setLoading(true)
    setError(null)
    const store = useStore.getState()
    try {
      await transitionSemester(sem.id, nextKey, carry, {
        getState: useStore.getState,
        getClasses: () => useStore.getState().classes,
        addSemester: store.addSemester,
        addClass: store.addClass,
        addHoliday: store.addHoliday,
        addTask: store.addTask,
        setGradeComponents: store.setGradeComponents,
        setTargetGrade: store.setTargetGrade,
        setPresetUpdatedAt: store.setPresetUpdatedAt,
        reassignSemesterData: store.reassignSemesterData,
        advanceCourseAvg: store.advanceCourseAvg,
        deleteSemester: store.deleteSemester,
        setActiveSemester: store.setActiveSemester,
      })
    } catch {
      setError(t.presetError)
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t.nextSemesterTitle}</DialogTitle>
          <DialogDescription>{t.nextSemesterDesc}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-medium">
          {presetFullLabel(nextKey, lang)}
        </div>

        <div className="space-y-2.5 pt-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.carryOverTitle}</p>
          {CARRY_KEYS.map(key => (
            <label key={key} className="flex items-center gap-2.5 text-sm">
              <Checkbox
                checked={carry[key]}
                onCheckedChange={v => setCarry(c => ({ ...c, [key]: v === true }))}
                disabled={loading}
              />
              <span>{t[CARRY_LABEL_KEY[key]]}</span>
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">{counts?.[key] ?? 0}</span>
            </label>
          ))}
          <p className="text-xs text-muted-foreground">{t.carryOverAlwaysKept}</p>
          <p className="text-xs text-destructive">{t.carryOverDiscardWarning}</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleTransition} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.loadNextSemester}
          </Button>
          <Button variant="ghost" disabled={loading} onClick={() => dismissNextSemester(activeSemesterId)}>
            {t.dismissNextSemester}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
