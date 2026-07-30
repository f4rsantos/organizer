import { TourFrame } from './TourScene'

const RADIUS = 35
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const BTN_BASE = 'rounded-md px-2 py-0.5 text-[9px] font-semibold whitespace-nowrap'
const BTN_PRIMARY = `${BTN_BASE} bg-primary text-primary-foreground`
const BTN_MUTED = `${BTN_BASE} bg-secondary`

export function FocusPanel({ labels }) {
  return (
    <TourFrame>
      <svg viewBox="0 0 100 100" className="absolute left-1/2 top-[38%] h-[4.5rem] w-[4.5rem] -translate-x-1/2 -translate-y-1/2 -rotate-90">
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle className="tour-focus-arc" cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="8"
          strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} />
      </svg>

      <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 text-center">
        <span className="tour-focus-clock text-base font-bold tabular-nums" />
      </div>

      <div className="absolute inset-x-0 bottom-8 h-3 text-center text-[9px] text-muted-foreground">
        <span className="tour-focus-phase tour-focus-phase-ready absolute inset-x-0 whitespace-nowrap">{labels.ready}</span>
        <span className="tour-focus-phase tour-focus-phase-run absolute inset-x-0 whitespace-nowrap">{labels.focusing}</span>
        <span className="tour-focus-phase tour-focus-phase-break absolute inset-x-0 whitespace-nowrap">{labels.break}</span>
      </div>

      <div className="absolute bottom-2.5 left-0 right-0 h-4">
        <div className="tour-focus-btns tour-focus-btns-ready absolute inset-x-0 flex items-center justify-center gap-1.5">
          <span className={BTN_PRIMARY}>{labels.start}</span>
        </div>
        <div className="tour-focus-btns tour-focus-btns-run absolute inset-x-0 flex items-center justify-center gap-1.5">
          <span className={BTN_PRIMARY}>{labels.pause}</span>
          <span className={BTN_MUTED}>{labels.reset}</span>
        </div>
        <div className="tour-focus-btns tour-focus-btns-break absolute inset-x-0 flex items-center justify-center gap-1.5">
          <span className={BTN_PRIMARY}>{labels.skip}</span>
          <span className={BTN_MUTED}>{labels.reset}</span>
        </div>
      </div>
    </TourFrame>
  )
}
