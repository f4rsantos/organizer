import { TourFrame } from '@/components/layout/onboarding/TourScene'
import './scenes-b.css'

const TASKS = [
  { id: 0, dot: 'bg-indigo-400', label: 'Read ch. 4' },
  { id: 1, dot: 'bg-amber-400', label: 'Problem set' },
  { id: 2, dot: 'bg-emerald-400', label: 'Lab report' },
]

export function StandbyScene() {
  return (
    <TourFrame className="border-white/10 bg-neutral-900">
      <div className="absolute inset-2.5 flex overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
        <div className="flex w-[42%] flex-col items-center justify-center gap-1.5 border-r border-white/10">
          <svg viewBox="0 0 40 40" className="guide-standby-ring h-11 w-11 -rotate-90">
            <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="3"
              className="text-neutral-800" />
            <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="3"
              strokeLinecap="round" strokeDasharray="106.8"
              className="guide-standby-ring-arc text-indigo-400" />
          </svg>
          <span className="guide-standby-time block font-mono text-[9px] font-semibold text-neutral-100" />
        </div>

        <div className="flex flex-1 flex-col justify-center gap-1.5 px-2.5">
          {TASKS.map(task => (
            <div key={task.id} className="flex items-center gap-1.5">
              <span className="relative h-1.5 w-1.5 shrink-0">
                <span className={`absolute inset-0 rounded-full ${task.dot}`} />
                <span className={`guide-standby-dot-${task.id} absolute inset-0 rounded-full bg-emerald-500 opacity-0`} />
              </span>
              <span className="h-1.5 flex-1 rounded-full bg-neutral-800" />
            </div>
          ))}
        </div>
      </div>
    </TourFrame>
  )
}
