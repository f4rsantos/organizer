import { TourFrame } from '@/components/layout/onboarding/TourScene'
import './scenes-b.css'

function CalGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

export function GoogleCalendarScene() {
  return (
    <TourFrame>
      <div className="absolute left-2.5 top-2.5 flex w-[38%] flex-col gap-1.5 rounded-lg border border-border bg-card p-2">
        <div className="flex items-center gap-1">
          <CalGlyph className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="text-[8px] font-semibold text-muted-foreground">Organizer</span>
        </div>
        <span className="rounded-sm bg-primary/25 px-1 py-0.5 text-[8px] font-semibold text-foreground">
          Midterm
        </span>
      </div>

      <div className="absolute right-2.5 top-2.5 flex w-[38%] flex-col gap-1.5 rounded-lg border border-border bg-card p-2">
        <div className="flex items-center gap-1">
          <CalGlyph className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="text-[8px] font-semibold text-muted-foreground">Google</span>
        </div>
        <span className="relative rounded-sm px-1 py-0.5 text-[8px] font-semibold">
          <span className="rounded-sm bg-secondary px-1 py-0.5 text-muted-foreground">Midterm</span>
          <span className="guide-gcal-chip absolute inset-0 rounded-sm bg-indigo-500/25 px-1 py-0.5 text-foreground opacity-0">
            Midterm
          </span>
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center">
        <span className="guide-gcal-dash-a absolute h-[2px] w-4 rounded-full bg-indigo-500" />
        <span className="guide-gcal-dash-b absolute h-[2px] w-4 rounded-full bg-indigo-500" />
      </div>
    </TourFrame>
  )
}
