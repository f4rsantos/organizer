import { useStore } from "@/store/useStore";
import { useStrings } from "@/lib/strings";
import { roundPT, formatGrade } from "@/lib/gradeUtils";
import { GradeInput } from "./GradeInput";
import { Input } from "@/components/ui/input";
import { selectSemesterGPA } from "@/store/selectors";

export function PreviousSemestersSection() {
  const semesters = useStore((s) => s.semesters);
  const activeSemesterId = useStore((s) => s.activeSemesterId);
  const grades = useStore((s) => s.grades);
  const allClasses = useStore((s) => s.classes);
  const courseAvg = useStore(
    (s) => s.courseAvg ?? { previousAvg: null, numSemesters: 0 },
  );
  const setSemesterFinalGrade = useStore((s) => s.setSemesterFinalGrade);
  const setCourseAvg = useStore((s) => s.setCourseAvg);
  const lang = useStore((s) => s.lang ?? "en");
  const t = useStrings(lang);

  const pastSemesters = semesters.filter((s) => s.id !== activeSemesterId);

  const semesterGrades = pastSemesters.map(
    (sem) => grades[sem.id]?._semesterFinalGrade ?? null,
  );
  const validSemGrades = semesterGrades.filter((g) => g !== null);
  const computedAvg =
    validSemGrades.length > 0
      ? roundPT(
          validSemGrades.reduce((a, b) => a + b, 0) / validSemGrades.length,
        )
      : null;

  const currentSemGPA = selectSemesterGPA(activeSemesterId, {
    semesters,
    classes: allClasses,
    grades,
  });

  const previousAvg = courseAvg.previousAvg ?? 0;
  const numSemesters = courseAvg.numSemesters ?? 0;

  let finalAvg = null;
  if (currentSemGPA !== null && (previousAvg > 0 || numSemesters > 0)) {
    if (numSemesters > 0 && previousAvg > 0) {
      finalAvg = roundPT(
        (previousAvg * numSemesters + currentSemGPA) / (numSemesters + 1),
      );
    } else if (currentSemGPA) {
      finalAvg = currentSemGPA;
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t.previousSemesters}
      </h2>

      {pastSemesters.map((sem) => (
        <div
          key={sem.id}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between">
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
        </div>
      ))}

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t.courseAvg}</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24">
                {t.previousAvg}
              </span>
              <GradeInput
                value={courseAvg.previousAvg}
                onChange={(v) => setCourseAvg({ ...courseAvg, previousAvg: v })}
                className="w-20 h-7 text-center text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24">
                {t.numSemesters}
              </span>
              <Input
                type="number"
                min="0"
                max="10"
                value={courseAvg.numSemesters ?? 0}
                onChange={(e) =>
                  setCourseAvg({
                    ...courseAvg,
                    numSemesters: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-20 h-7 text-center text-sm"
              />
            </div>
          </div>
        </div>
        {finalAvg !== null && (
          <div className="rounded-lg bg-primary/10 p-3 text-center">
            <p className="text-3xl font-semibold text-primary tabular-nums">
              {formatGrade(finalAvg)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
