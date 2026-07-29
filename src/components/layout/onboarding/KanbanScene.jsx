import { TourFrame } from './TourScene'

const COLUMN_FALLBACKS = ['To Do', 'In Progress', 'Done']

export function KanbanPanel({ columns }) {
  const labels = (columns?.length >= 3 ? columns.slice(0, 3) : COLUMN_FALLBACKS)

  return (
    <TourFrame>
      <div className="absolute inset-2.5 flex gap-2">
        {labels.map(label => (
          <div key={label} className="relative flex-1 rounded-lg bg-secondary">
            <span className="absolute left-2 top-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="tour-kanban-card absolute left-2.5 top-[34px] w-[calc((100%-1.25rem-1rem)/3)] rounded-lg border border-border bg-card p-2 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
          <span className="h-1.5 flex-1 rounded-full bg-foreground/25" />
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border">
          <div className="tour-kanban-progress h-full rounded-full bg-primary" />
        </div>
      </div>
    </TourFrame>
  )
}
