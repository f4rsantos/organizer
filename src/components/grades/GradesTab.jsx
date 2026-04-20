import { GraduationCap, BookOpen } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { EmptyState } from '@/components/common/EmptyState'
import { ClassGradeCard } from './ClassGradeCard'
import { GradeSummaryFooter } from './GradeSummaryFooter'
import { PreviousSemestersSection } from './PreviousSemestersSection'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function GradesTab() {
  const semesters = useStore(s => s.semesters)
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const setActiveSemester = useStore(s => s.setActiveSemester)
  const allClasses = useStore(s => s.classes)
  const grades = useStore(s => s.grades)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const semester = semesters.find(s => s.id === activeSemesterId) ?? null
  const classes = allClasses.filter(c => c.semesterId === activeSemesterId)

  if (!semester) {
    return <EmptyState icon={GraduationCap} title={t.noSemester} description={t.goToSettings} />
  }

  return (
    <div className="h-[calc(100vh-5rem)] md:h-screen overflow-y-auto">
    <div className="space-y-4 p-4 pt-6 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t.grades}</h1>
        {semesters.length > 1 && (
          <Select value={activeSemesterId} onValueChange={setActiveSemester}>
            <SelectTrigger className="h-8 text-sm w-auto gap-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {semesters.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {classes.length === 0
        ? <EmptyState icon={BookOpen} title={t.noClassesYet} description={t.addClassesInSettings} />
        : (
          <>
            <div className="space-y-3">
              {classes.map(cls => (
                <ClassGradeCard key={cls.id} cls={cls} semId={activeSemesterId}
                  gradeData={grades[activeSemesterId]?.[cls.id]} />
              ))}
            </div>
            <GradeSummaryFooter semId={activeSemesterId} />
            <PreviousSemestersSection />
          </>
        )
      }
    </div>
    </div>
  )
}
