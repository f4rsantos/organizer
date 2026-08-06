import { Label } from '@/components/ui/label'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { selectNeededGrade } from '@/store/selectors'
import { formatGrade, gradeScaleOf, passThresholdOf } from '@/lib/gradeUtils'
import { GradeInput } from './GradeInput'

export function NeededGradePanel({ semId, classId, gradeData }) {
  const setTargetGrade = useStore(s => s.setTargetGrade)
  const scale = useStore(s => gradeScaleOf(s.settings))
  const passThreshold = useStore(s => passThresholdOf(s.settings))
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const needed = selectNeededGrade(gradeData, passThreshold)

  return (
    <div className="pt-3 space-y-2">
      <div className="flex items-center gap-3">
        <Label className="text-xs shrink-0">{t.targetGrade}</Label>
        <GradeInput value={gradeData?.targetGrade ?? passThreshold} onChange={v => setTargetGrade(semId, classId, v ?? passThreshold)} className="h-7 w-20 text-sm text-center" />
      </div>
      {needed !== null && (
        <p className="text-sm">
          {t.youNeed} <span className={`font-semibold ${needed > scale ? 'text-destructive' : 'text-primary'}`}>{formatGrade(needed)}</span>
          {needed > scale ? t.notAchievable : t.onRemaining}
        </p>
      )}
      {needed === null && <p className="text-xs text-muted-foreground">{t.allGraded}</p>}
    </div>
  )
}
