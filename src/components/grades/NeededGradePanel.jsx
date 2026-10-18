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
    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/50 pt-3">
      <div className="flex items-center gap-2">
        <Label className="shrink-0 text-xs text-muted-foreground">{t.targetGrade}</Label>
        <GradeInput value={gradeData?.targetGrade ?? passThreshold} onChange={v => setTargetGrade(semId, classId, v ?? passThreshold)} className="h-7 w-16 text-center text-sm" />
      </div>
      <p className="ml-auto text-xs text-muted-foreground">
        {needed === null
          ? t.allGraded
          : <>{t.youNeed} <span className={`text-sm font-semibold ${needed > scale ? 'text-destructive' : 'text-primary'}`}>{formatGrade(needed)}</span>{needed > scale ? t.notAchievable : t.onRemaining}</>}
      </p>
    </div>
  )
}
