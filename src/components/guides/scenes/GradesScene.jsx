import { TourFrame } from '@/components/layout/onboarding/TourScene'
import './scenes-a.css'

export function GradesScene() {
  return (
    <TourFrame>
      <div className="absolute inset-x-3 top-2.5 flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
        <span className="truncate text-[10px] font-semibold">Algorithms</span>
        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[8px] font-semibold text-muted-foreground">6 ECTS</span>
        <span className="ml-auto text-sm font-bold tabular-nums text-primary guide-grades-avg" />
      </div>

      <div className="absolute inset-x-3 top-9 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 rounded-md bg-secondary px-1.5 py-1">
          <span className="flex-1 truncate text-[9px] text-muted-foreground">Exam</span>
          <span className="text-[8px] text-muted-foreground">60%</span>
          <span className="flex h-4 w-6 items-center justify-center rounded bg-card text-[9px] font-semibold tabular-nums">14</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-secondary px-1.5 py-1">
          <span className="flex-1 truncate text-[9px] text-muted-foreground">Project</span>
          <span className="text-[8px] text-muted-foreground">40%</span>
          <span className="guide-grades-input flex h-4 w-6 items-center justify-center rounded text-[9px] font-semibold tabular-nums" />
        </div>
      </div>

      <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between rounded-md bg-secondary px-2 py-1">
        <span className="text-[8px] font-medium text-muted-foreground">Needed for 16</span>
        <span className="text-[10px] font-bold tabular-nums text-primary guide-grades-needed" />
      </div>
    </TourFrame>
  )
}
