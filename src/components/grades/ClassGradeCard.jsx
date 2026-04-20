import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { accumulatedScore, formatGrade } from '@/lib/gradeUtils'
import { GradeComponentRow } from './GradeComponentRow'
import { NeededGradePanel } from './NeededGradePanel'
import { useGradeHandlers } from './useGradeHandlers'

export function ClassGradeCard({ cls, semId, gradeData }) {
  const setGradeComponents = useStore(s => s.setGradeComponents)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const components = gradeData?.components ?? []
  const score = accumulatedScore(components)
  const { updateGrade, addSubcomponent, removeSubcomponent, updateSubGrade } =
    useGradeHandlers(semId, cls.id, components, setGradeComponents)

  return (
    <Card>
      <CardContent className="p-4 space-y-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cls.color }} />
          <span className="font-medium flex-1">{cls.name}</span>
          <Badge variant="secondary" className="text-xs">{cls.ects} ECTS</Badge>
          <span className={`text-lg font-semibold tabular-nums ${score !== null && score < 9.5 ? 'text-destructive' : 'text-primary'}`}>
            {formatGrade(score)}
          </span>
        </div>

        {components.length === 0
          ? <p className="text-xs text-muted-foreground py-2">{t.noGradeComponents}</p>
          : components.map(c => (
              <GradeComponentRow key={c.id} component={c} onChange={updateGrade}
                onAddSub={addSubcomponent} onRemoveSub={removeSubcomponent} onSubGradeChange={updateSubGrade}
              />
            ))
        }

        <NeededGradePanel semId={semId} classId={cls.id} gradeData={gradeData} open={components.length > 0} />
      </CardContent>
    </Card>
  )
}
