import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { selectSemesterGPA } from '@/store/selectors'
import { formatGrade } from '@/lib/gradeUtils'

export function GradeSummaryFooter({ semId }) {
  const semesters = useStore(s => s.semesters)
  const allClasses = useStore(s => s.classes)
  const grades = useStore(s => s.grades)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const classes = allClasses.filter(c => c.semesterId === semId)
  const semGrades = grades[semId] ?? {}

  const gpa = selectSemesterGPA(semId, { semesters, classes: allClasses, grades })

  const totalEcts = classes.reduce((sum, cls) => {
    const data = semGrades[cls.id]
    const avg = data?.components?.length > 0 ? null : data?.finalGrade
    const passing = (data?.finalGrade ?? avg) >= 9.5
    return passing ? sum + (cls.ects ?? 6) : sum
  }, 0)

  return (
    <div className="rounded-xl bg-secondary/60 p-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-muted-foreground">{t.semesterAvg}</p>
        <p className={`text-2xl font-semibold tabular-nums ${gpa !== null && gpa < 9.5 ? 'text-destructive' : 'text-primary'}`}>
          {formatGrade(gpa)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">{t.ectsPassedLabel}</p>
        <p className="text-2xl font-semibold tabular-nums">{totalEcts}</p>
      </div>
    </div>
  )
}
