import { TourFrame } from './TourScene'

export function SharePanel({ labels }) {
  return (
    <TourFrame>
      <div className="absolute inset-x-2.5 top-2.5 flex gap-1.5">
        <span className="tour-share-btn flex-1 rounded-lg bg-secondary py-1 text-center text-[9px] font-semibold">
          {labels.export}
        </span>
        <span className="flex-1 rounded-lg bg-secondary py-1 text-center text-[9px] font-semibold text-muted-foreground">
          {labels.import}
        </span>
      </div>

      <div className="tour-share-file absolute inset-x-2.5 top-[46px] flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-2.5">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
        </svg>
        <span className="font-mono text-[8px] font-semibold">organizer.json</span>
      </div>

      <div className="tour-share-file absolute inset-x-2.5 top-[86px] h-1 overflow-hidden rounded-full bg-border">
        <div className="tour-share-bar h-full rounded-full bg-primary" />
      </div>

      <div className="tour-share-done absolute bottom-3 left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor"
          strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 13 4 4 10-10" />
        </svg>
      </div>
    </TourFrame>
  )
}
