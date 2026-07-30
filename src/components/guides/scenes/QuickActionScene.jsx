import { TourFrame } from '@/components/layout/onboarding/TourScene'
import './scenes-a.css'

export function QuickActionScene() {
  return (
    <TourFrame>
      <div className="guide-qa-dim absolute inset-0 bg-background/70" />

      <div className="guide-qa-modal absolute inset-x-6 top-3 rounded-lg border border-border bg-card p-2 shadow-lg">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span className="truncate whitespace-nowrap font-mono text-[9px] text-foreground">
            <span className="guide-qa-type">essay for monday</span>
          </span>
        </div>
      </div>

      <div className="guide-qa-result absolute inset-x-6 bottom-3 flex items-center gap-1.5 rounded-lg border border-border bg-card p-1.5 shadow-sm">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
        <span className="truncate text-[9px] font-semibold">Essay</span>
        <span className="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-[7px] font-semibold text-muted-foreground">Mon</span>
      </div>
    </TourFrame>
  )
}
