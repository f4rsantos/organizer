import { TourFrame } from '@/components/layout/onboarding/TourScene'
import './scenes-a.css'

const QUADRANTS = [
  { label: 'Do', className: 'bg-rose-500/10' },
  { label: 'Plan', className: 'bg-amber-400/10' },
  { label: 'Delegate', className: 'bg-sky-400/10' },
  { label: 'Drop', className: 'bg-secondary' },
]

export function EisenhowerScene({ t }) {
  return (
    <TourFrame>
      <div className="absolute inset-2.5 grid grid-cols-2 grid-rows-2 gap-1.5">
        {QUADRANTS.map(q => (
          <div key={q.label} className={`relative rounded-lg ${q.className}`}>
            <span className="absolute left-1.5 top-1 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t?.[`eisenhowerScene${q.label}`] ?? q.label}
            </span>
          </div>
        ))}
      </div>

      <div className="guide-ei-card absolute w-[38%] rounded-lg border border-border bg-card p-1.5">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
          <span className="h-1.5 flex-1 rounded-full bg-foreground/25" />
        </div>
        <div className="mt-1 h-1.5 w-2/3 rounded-full bg-foreground/15" />
      </div>
    </TourFrame>
  )
}
