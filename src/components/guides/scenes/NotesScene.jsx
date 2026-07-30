import { TourFrame } from '@/components/layout/onboarding/TourScene'
import './scenes-a.css'

export function NotesScene() {
  return (
    <TourFrame>
      <div className="absolute inset-3 rounded-lg border border-border bg-card p-2.5">
        <span className="absolute right-2 top-2 rounded-md bg-secondary px-1.5 py-0.5 text-[8px] font-semibold text-muted-foreground">
          MD
        </span>

        <div className="guide-notes-rendered absolute inset-2.5">
          <div className="h-2 w-2/3 rounded-full bg-foreground/70" />
          <div className="mt-2 flex items-center gap-1">
            <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
            <span className="h-1.5 w-3/4 rounded-full bg-foreground/25" />
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
            <span className="h-1.5 w-1/2 rounded-full bg-foreground/25" />
          </div>
        </div>

        <div className="guide-notes-source absolute inset-2.5 font-mono text-[9px] leading-relaxed text-foreground">
          <div><span className="guide-notes-type-1"># Heading</span></div>
          <div className="mt-1 text-muted-foreground"><span className="guide-notes-type-2">- item 1</span></div>
        </div>
      </div>
    </TourFrame>
  )
}
