import { TourFrame } from '@/components/layout/onboarding/TourScene'
import './scenes-c.css'

function Tomato({ className, colorClass, size }) {
  return (
    <div className={className}>
      <div
        className={`relative rounded-full ${colorClass}`}
        style={{ width: size, height: size }}
      >
        <div className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-emerald-600" />
        <div className="absolute left-[30%] top-[35%] h-[3px] w-[3px] rounded-full bg-black/20" />
        <div className="absolute right-[30%] top-[35%] h-[3px] w-[3px] rounded-full bg-black/20" />
      </div>
    </div>
  )
}

export function PomodoroScene() {
  return (
    <TourFrame className="bg-gradient-to-b from-background to-secondary">
      <span className="absolute left-2.5 top-2.5 text-[9px] font-semibold text-muted-foreground">
        3 today
      </span>

      <div className="absolute inset-x-2.5 bottom-4 h-px bg-border" />

      <Tomato className="guide-tomato-drop-1 absolute" colorClass="bg-emerald-500" size="18px" />
      <Tomato className="guide-tomato-drop-2 absolute" colorClass="bg-amber-400" size="22px" />
      <Tomato className="guide-tomato-drop-3 absolute" colorClass="bg-rose-500" size="16px" />
    </TourFrame>
  )
}
