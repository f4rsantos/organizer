import { Label } from '@/components/ui/label'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { selectNeededGrade } from '@/store/selectors'
import { formatGrade } from '@/lib/gradeUtils'
import { GradeInput } from './GradeInput'

export function NeededGradePanel({ semId, classId, gradeData }) {
  const setTargetGrade = useStore(s => s.setTargetGrade)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const needed = selectNeededGrade(gradeData)

  return (
    <div className="pt-3 space-y-2">
      <div className="flex items-center gap-3">
        <Label className="text-xs shrink-0">{t.targetGrade}</Label>
        <GradeInput value={gradeData?.targetGrade ?? 9.5} onChange={v => setTargetGrade(semId, classId, v ?? 9.5)} className="h-7 w-20 text-sm text-center" />
      </div>
      {needed !== null && (
        <p className="text-sm">
          {t.youNeed} <span className={`font-semibold ${needed > 20 ? 'text-destructive' : 'text-primary'}`}>{formatGrade(needed)}</span>
          {needed > 20 ? t.notAchievable : t.onRemaining}
        </p>
      )}
      {needed === null && <p className="text-xs text-muted-foreground">{t.allGraded}</p>}
    </div>
  )
}
