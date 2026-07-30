import { TourFrame } from './TourScene'

const GROUPS = [
  { dot: 'bg-indigo-500', rows: ['r1', 'r2'] },
  { dot: 'bg-emerald-500', rows: ['r3'] },
]

function Row({ id }) {
  return (
    <div className={`tour-task-row tour-task-${id} flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1`}>
      <span className={`tour-task-box tour-task-box-${id} relative flex h-3 w-3 shrink-0 items-center justify-center rounded border-[1.5px] border-muted-foreground`}>
        <svg viewBox="0 0 24 24" className={`tour-task-tick tour-task-tick-${id} absolute h-2.5 w-2.5`}
          fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 13 4 4 10-10" />
        </svg>
      </span>
      <span className={`tour-task-label tour-task-label-${id} h-1.5 flex-1 rounded-full bg-foreground/25`} />
    </div>
  )
}

export function TasksPanel({ groupLabels }) {
  return (
    <TourFrame>
      <div className="absolute inset-x-2.5 top-2.5 space-y-1">
        {GROUPS.map((group, gi) => (
          <div key={gi} className="space-y-1">
            <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-2 py-1">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${group.dot}`} />
              <span className="text-[8px] font-semibold text-muted-foreground">
                {groupLabels?.[gi] ?? ''}
              </span>
              <span className={`tour-task-count tour-task-count-${gi} ml-auto text-[8px] font-medium tabular-nums text-muted-foreground`} />
            </div>
            <div className="space-y-1 pl-2">
              {group.rows.map(id => <Row key={id} id={id} />)}
            </div>
          </div>
        ))}
      </div>
    </TourFrame>
  )
}
