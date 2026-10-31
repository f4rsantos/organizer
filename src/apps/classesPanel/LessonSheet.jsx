import { Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'
import { longDate } from '@/lib/dateLabels'
import { TopicsChecklist } from './TopicsChecklist'
import { ChoiceChip } from './ChoiceChip'
import { lessonTypeLabel, studyTypeLabel } from './labels'

function SheetSection({ title, children }) {
  return (
    <section className="space-y-2">
      <Label className="text-xs text-muted-foreground">{title}</Label>
      {children}
    </section>
  )
}

function StudySteps({ t, session, studyTypes, onPatch }) {
  return (
    <SheetSection title={t.classesStudyTypes}>
      <div className="space-y-0.5">
        {studyTypes.map(type => {
          const done = Boolean(session.studied?.[type.id])
          return (
            <label key={type.id} className="flex cursor-pointer items-center gap-2.5 py-1">
              <Checkbox checked={done} onCheckedChange={value => onPatch({ studied: { ...session.studied, [type.id]: value } })} />
              <span className={cn('text-sm', done && 'text-muted-foreground line-through')}>{studyTypeLabel(t, type)}</span>
            </label>
          )
        })}
      </div>
    </SheetSection>
  )
}

function LessonDetails({ t, session, lessonTypes, onPatch, onRemove }) {
  return (
    <>
      <SheetSection title={t.classesLessonType}>
        <div className="flex flex-wrap gap-1.5">
          {lessonTypes.map(({ id }) => (
            <ChoiceChip key={id} active={session.type === id} onClick={() => onPatch({ type: id })}>
              {lessonTypeLabel(t, id, lessonTypes)}
            </ChoiceChip>
          ))}
        </div>
      </SheetSection>
      {session.manual && (
        <SheetSection title={t.classesLessonDate}>
          <Input type="date" className="h-8 w-44" value={session.date}
            onChange={e => { if (e.target.value) onPatch({ date: e.target.value }) }} />
        </SheetSection>
      )}
      <Button variant="ghost" size="sm" className="self-start text-muted-foreground hover:text-destructive" onClick={onRemove}>
        <Trash2 />{t.classesRemoveLesson}
      </Button>
    </>
  )
}

export function LessonSheet({ t, classId, session, studyTypes, lessonTypes, notesOnly = false, onClose }) {
  const patchLessonSession = useStore(s => s.patchLessonSession)
  const removeLessonSession = useStore(s => s.removeLessonSession)
  const patch = data => patchLessonSession(classId, session.key, data)
  const remove = () => {
    removeLessonSession(classId, session.key)
    onClose()
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-md gap-5 sm:max-w-md">
        <DialogHeader className="gap-1 pr-8">
          <DialogTitle className="text-xs font-normal text-muted-foreground">
            {longDate(t, session.date)}{session.manual ? ` · ${t.classesManualTag}` : ''}
          </DialogTitle>
          <Input defaultValue={session.theme} placeholder={t.classesThemePlaceholder}
            onBlur={e => { if (e.target.value.trim() !== session.theme) patch({ theme: e.target.value.trim() }) }}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            className="h-auto border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0" />
        </DialogHeader>
        {!notesOnly && <StudySteps t={t} session={session} studyTypes={studyTypes} onPatch={patch} />}
        <SheetSection title={t.classesTopics}>
          <TopicsChecklist t={t} topics={session.topics ?? []} onChange={topics => patch({ topics })} />
        </SheetSection>
        {!notesOnly && <LessonDetails t={t} session={session} lessonTypes={lessonTypes} onPatch={patch} onRemove={remove} />}
      </DialogContent>
    </Dialog>
  )
}
