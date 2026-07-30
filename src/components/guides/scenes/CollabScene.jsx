import { TourFrame } from '@/components/layout/onboarding/TourScene'
import './scenes-c.css'

function PeopleGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function CollabScene() {
  return (
    <TourFrame>
      <div className="absolute inset-x-3 top-4 rounded-xl border border-border bg-card p-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
          <span className="h-1.5 flex-1 rounded-full bg-foreground/25" />
        </div>

        <div className="guide-collab-badge mt-1.5 inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5">
          <PeopleGlyph className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="text-[8px] font-semibold text-muted-foreground">Team</span>
        </div>

        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border">
          <div className="guide-collab-progress h-full rounded-full bg-primary" />
        </div>

        <div className="guide-collab-updated mt-1.5 text-[8px] text-muted-foreground">
          updated just now
        </div>
      </div>
    </TourFrame>
  )
}
