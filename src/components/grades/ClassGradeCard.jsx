import { Card, CardContent } from '@/components/ui/card'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { accumulatedScore, formatGrade, gradeScaleOf, gradedFraction, passThresholdOf } from '@/lib/gradeUtils'
import { GradeComponentRow } from './GradeComponentRow'
import { NeededGradePanel } from './NeededGradePanel'
import { GradeProgressBar } from './GradeProgressBar'
import { useGradeHandlers } from './useGradeHandlers'

export function ClassGradeCard({ cls, semId, gradeData }) {
  const setGradeComponents = useStore(s => s.setGradeComponents)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const passThreshold = useStore(s => passThresholdOf(s.settings))
  const scale = useStore(s => gradeScaleOf(s.settings))
  const components = gradeData?.components ?? []
  const score = accumulatedScore(components)
  const { updateGrade, addSubcomponent, removeSubcomponent, updateSubGrade, updateSubWeight } =
    useGradeHandlers(semId, cls.id, components, setGradeComponents)

  const gradedPct = Math.round(gradedFraction(components) * 100)

  return (
    <Card className="h-full rounded-2xl border-border py-0">
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-2.5 mb-2.5">
          <div className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cls.color }} />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate leading-snug">{cls.name}</p>
            <p className="text-xs text-muted-foreground">
              {cls.ects} ECTS
              {components.length > 0 && ` · ${t.pctDone(gradedPct)}`}
            </p>
          </div>
          <span className={`text-2xl font-semibold tabular-nums leading-none ${score !== null && score < passThreshold ? 'text-destructive' : 'text-foreground'}`}>
            {formatGrade(score)}
          </span>
        </div>
        {score !== null && (
          <div className="mb-3">
            <GradeProgressBar score={score} scale={scale} color={cls.color} failing={score < passThreshold} />
          </div>
        )}

        {components.length === 0
          ? <p className="text-xs text-muted-foreground py-2">{t.noGradeComponents}</p>
          : components.map(c => (
              <GradeComponentRow key={c.id ?? c.name} component={c} onChange={updateGrade}
                onAddSub={addSubcomponent} onRemoveSub={removeSubcomponent} onSubGradeChange={updateSubGrade}
                onSubWeightChange={updateSubWeight}
              />
            ))
        }

        <NeededGradePanel semId={semId} classId={cls.id} gradeData={gradeData} open={components.length > 0} />
      </CardContent>
    </Card>
  )
}
