import { TourFrame } from '@/components/layout/onboarding/TourScene'
import './scenes-b.css'

const CELLS = Array.from({ length: 21 }, (_, i) => i)
const RINGED = new Set([9, 12, 17])
const CHIP_STYLES = {
  9: { className: 'guide-ei-chip-a bg-indigo-500' },
  12: { className: 'guide-ei-chip-b bg-amber-400' },
  17: { className: 'guide-ei-chip-c bg-emerald-500' },
}

export function EiCalendarScene() {
  return (
    <TourFrame>
      <div className="absolute right-2.5 top-2 flex items-center gap-1">
        <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 text-muted-foreground"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 2 9l10 6 10-6-10-6Z" /><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" />
        </svg>
        <span className="text-[8px] font-semibold text-muted-foreground">Syllabus</span>
      </div>

      <div className="absolute inset-x-2.5 bottom-2.5 top-8 grid grid-cols-7 grid-rows-3 gap-1">
        {CELLS.map(i => (
          <div key={i} className="relative rounded-[3px] border border-border bg-card">
            {RINGED.has(i) && (
              <span className={`guide-ei-ring-${i} absolute inset-0 rounded-[3px] ring-1 ring-primary`} />
            )}
            {CHIP_STYLES[i] && (
              <span className={`absolute inset-x-0.5 bottom-0.5 h-1 rounded-[1px] ${CHIP_STYLES[i].className}`} />
            )}
          </div>
        ))}
      </div>
    </TourFrame>
  )
}
