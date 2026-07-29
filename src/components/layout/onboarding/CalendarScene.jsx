import { TourFrame } from './TourScene'

const HOUR_LABELS = ['9', '12', '15']
const WEEK_EVENTS = [null, { top: 30, height: 14 }, { top: 16, height: 22 }, null, { top: 58, height: 10 }, null, null]
const MONTH_CELLS = 35
const MONTH_HITS = { 9: 'primary', 15: 'amber', 23: 'primary' }
const YEAR_TINTS = { 1: 2, 2: 5, 6: 4, 8: 1, 10: 3 }

export function CalendarPanel({ views, weekdays }) {
  const tabs = views?.length === 4 ? views : ['Day', 'Week', 'Month', 'Year']
  const days = weekdays?.length === 7 ? weekdays : ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <TourFrame>
      <div className="absolute left-2.5 right-2.5 top-2 z-10">
        <div className="relative flex rounded-lg bg-secondary p-0.5">
          <span className="tour-cal-indicator absolute inset-y-0.5 w-1/4 rounded-md bg-background shadow-sm" />
          {tabs.map(tab => (
            <span key={tab} className="relative flex-1 truncate py-0.5 text-center text-[8px] font-semibold text-muted-foreground">
              {tab}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-2.5 bottom-2.5 top-[30px]">
        <div className="tour-cal-pane tour-cal-day absolute inset-0 flex gap-1">
          <div className="relative w-3 shrink-0">
            {HOUR_LABELS.map((label, i) => (
              <span key={label} className="absolute right-0 text-[6px] text-muted-foreground"
                style={{ top: `${14 + i * 28}%` }}>{label}</span>
            ))}
          </div>
          <div className="relative flex-1 rounded border border-border/70 bg-card">
            {[14, 28, 42, 56, 70, 84].map(top => (
              <span key={top} className="absolute inset-x-0 border-t border-border/40" style={{ top: `${top}%` }} />
            ))}
            <span className="absolute left-1 right-1/3 rounded-sm bg-primary/25" style={{ top: '16%', height: '22%' }} />
            <span className="absolute left-8 right-1 rounded-sm bg-amber-500/30" style={{ top: '58%', height: '14%' }} />
          </div>
        </div>

        <div className="tour-cal-pane tour-cal-week absolute inset-0 flex gap-1">
          <div className="relative w-3 shrink-0">
            {HOUR_LABELS.map((label, i) => (
              <span key={label} className="absolute right-0 text-[6px] text-muted-foreground"
                style={{ top: `${14 + i * 28}%` }}>{label}</span>
            ))}
          </div>
          <div className="grid flex-1 grid-cols-7 gap-px">
            {WEEK_EVENTS.map((event, i) => (
              <div key={i} className="relative overflow-hidden rounded-sm border border-border/60 bg-card">
                <span className="absolute inset-x-0 top-0.5 text-center text-[5px] text-muted-foreground">
                  {days[i]?.slice(0, 1)}
                </span>
                {event && (
                  <span className="absolute inset-x-0.5 rounded-sm bg-primary/25"
                    style={{ top: `${event.top}%`, height: `${event.height}%` }} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="tour-cal-pane tour-cal-month absolute inset-0 grid grid-cols-7 grid-rows-5 gap-px">
          {Array.from({ length: MONTH_CELLS }, (_, i) => (
            <div key={i} className="relative rounded-[2px] border border-border/50 bg-card">
              {MONTH_HITS[i] && (
                <span className={`absolute inset-x-px bottom-px h-1 rounded-[1px] ${
                  MONTH_HITS[i] === 'amber' ? 'bg-amber-500/50' : 'bg-primary/50'
                }`} />
              )}
              {i === 15 && <span className="absolute inset-0 rounded-[2px] ring-1 ring-primary" />}
            </div>
          ))}
        </div>

        <div className="tour-cal-pane tour-cal-year absolute inset-0 grid grid-cols-4 grid-rows-3 gap-1">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-px rounded-[3px] border border-border/50 bg-card p-px">
              <span className={`text-[5px] font-semibold leading-none ${i === 6 ? 'text-primary' : 'text-muted-foreground'}`}>
                {i + 1}
              </span>
              <div className="grid w-full flex-1 grid-cols-7 gap-px">
                {Array.from({ length: 14 }, (_, d) => (
                  <span key={d} className={`rounded-[1px] ${
                    YEAR_TINTS[i] === d ? 'bg-primary/40' : 'bg-secondary'
                  }`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </TourFrame>
  )
}
