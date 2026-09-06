import { useStore } from "@/store/useStore";
import { useStrings } from "@/lib/strings";
import { foldSemesterIntoAvg, formatGrade, passThresholdOf } from "@/lib/gradeUtils";
import { GradeInput } from "./GradeInput";
import { Input } from "@/components/ui/input";
import { selectSemesterGPA } from "@/store/selectors";

export function PreviousSemestersSection({ semId }) {
  const semesters = useStore((s) => s.semesters);
  const grades = useStore((s) => s.grades);
  const allClasses = useStore((s) => s.classes);
  const courseAvg = useStore(
    (s) => s.courseAvg ?? { previousAvg: null, numSemesters: 0 },
  );
  const setSemesterFinalGrade = useStore((s) => s.setSemesterFinalGrade);
  const setCourseAvg = useStore((s) => s.setCourseAvg);
  const passThreshold = useStore((s) => passThresholdOf(s.settings));
  const lang = useStore((s) => s.lang ?? "en");
  const t = useStrings(lang);

  const pastSemesters = semesters.filter((s) => s.id !== semId);

  const currentSemGPA = selectSemesterGPA(semId, {
    semesters,
    classes: allClasses,
    grades,
  });

  const previousAvg = courseAvg.previousAvg ?? 0;
  const numSemesters = courseAvg.numSemesters ?? 0;

  const courseAverage =
    currentSemGPA !== null
      ? foldSemesterIntoAvg(previousAvg, numSemesters, currentSemGPA)
      : (previousAvg > 0 ? previousAvg : null);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t.semesterAvg}</p>
            <p className={`text-2xl font-semibold tabular-nums leading-none mt-1 ${currentSemGPA !== null && currentSemGPA < passThreshold ? 'text-destructive' : 'text-foreground'}`}>
              {formatGrade(currentSemGPA)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t.courseAvg}</p>
            <p className={`text-2xl font-semibold tabular-nums leading-none mt-1 ${courseAverage !== null && courseAverage < passThreshold ? 'text-destructive' : 'text-foreground'}`}>
              {formatGrade(courseAverage)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t.previousAvg}</span>
            <GradeInput
              value={courseAvg.previousAvg}
              onChange={(v) => setCourseAvg({ ...courseAvg, previousAvg: v })}
              className="w-16 h-7 text-center text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t.numSemesters}</span>
            <Input
              type="number"
              min="0"
              max="10"
              value={courseAvg.numSemesters}
              onChange={(e) =>
                setCourseAvg({
                  ...courseAvg,
                  numSemesters: e.target.value,
                })
              }
              onBlur={() =>
                setCourseAvg({
                  ...courseAvg,
                  numSemesters: Math.max(0, parseInt(courseAvg.numSemesters, 10) || 0),
                })
              }
              className="w-16 h-7 text-center text-sm"
            />
          </div>
        </div>
      </div>

      {pastSemesters.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.previousSemesters}
          </h2>
          {pastSemesters.map((sem) => (
            <div
              key={sem.id}
              className="rounded-xl border border-border bg-card p-4 flex items-center justify-between"
            >
              <p className="font-medium text-sm">{sem.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {t.finalGrade}
                </span>
                <GradeInput
                  value={grades[sem.id]?._semesterFinalGrade ?? null}
                  onChange={(v) => setSemesterFinalGrade(sem.id, v)}
                  className="w-20 h-7 text-center text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
