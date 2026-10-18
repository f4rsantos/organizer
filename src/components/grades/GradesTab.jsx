import { GraduationCap, BookOpen } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { EmptyState } from '@/components/common/EmptyState'
import { ClassGradeCard } from './ClassGradeCard'
import { PreviousSemestersSection } from './PreviousSemestersSection'

export function GradesTab() {
  const semesters = useStore(s => s.semesters)
  const activeSemesterId = useStore(s => s.activeSemesterId)
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
    <div className="h-tab-pane overflow-y-auto">
    <div className="space-y-4 p-4 pt-6 pb-8">
      <h1 className="text-xl font-semibold tracking-tight">{t.grades}</h1>

      {classes.length === 0
        ? <EmptyState icon={BookOpen} title={t.noClassesYet} description={t.addClassesInSettings} />
        : (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {classes.map(cls => (
                <ClassGradeCard key={cls.id} cls={cls} semId={activeSemesterId}
                  gradeData={grades[activeSemesterId]?.[cls.id]} />
              ))}
            </div>
            <PreviousSemestersSection semId={activeSemesterId} />
          </>
        )
      }
    </div>
    </div>
  )
}
