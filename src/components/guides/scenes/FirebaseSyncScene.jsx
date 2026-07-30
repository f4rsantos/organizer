import { TourFrame } from '@/components/layout/onboarding/TourScene'
import './scenes-c.css'

function CloudGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  )
}

function Phone({ className, children }) {
  return (
    <div className={`absolute top-3 h-[6.5rem] w-9 rounded-xl border-2 border-border bg-card p-1.5 ${className}`}>
      <div className="flex h-full flex-col justify-center gap-1.5">
        {children}
      </div>
    </div>
  )
}

export function FirebaseSyncScene() {
  return (
    <TourFrame>
      <CloudGlyph className="absolute left-1/2 top-2 h-5 w-5 -translate-x-1/2 text-muted-foreground" />

      <Phone className="left-3">
        <div className="h-1.5 w-full rounded-full bg-secondary" />
        <div className="h-1.5 w-full rounded-full bg-primary" />
      </Phone>

      <Phone className="right-3">
        <div className="guide-fb-bar-1 h-1.5 w-full rounded-full bg-secondary" />
        <div className="guide-fb-bar-2 h-1.5 w-full rounded-full bg-secondary" />
      </Phone>

      <div className="guide-fb-pulse absolute h-1.5 w-1.5 rounded-full bg-primary" />
    </TourFrame>
  )
}
