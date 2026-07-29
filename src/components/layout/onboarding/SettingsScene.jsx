import { TourFrame } from './TourScene'

function Chevron({ id }) {
  return (
    <svg viewBox="0 0 24 24" className={`tour-set-chev tour-set-chev-${id} ml-auto h-2 w-2`}
      fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export function SettingsPanel({ rows }) {
  const labels = rows?.length === 3 ? rows : ['General', 'Apps', 'Data & sync']

  return (
    <TourFrame>
      <div className="absolute inset-x-2.5 top-2 space-y-1">
        {labels.map((label, i) => (
          <div key={label} className={`tour-set-row tour-set-row-${i} flex items-center gap-1.5 rounded-lg bg-secondary px-2 py-0.5 text-[9px] font-semibold`}>
            <span className="truncate">{label}</span>
            <Chevron id={i} />
          </div>
        ))}
      </div>

      <div className="absolute inset-x-2.5 bottom-2 top-[70px] overflow-hidden rounded-lg border border-border bg-card">
        <div className="tour-set-pane tour-set-pane-0 absolute inset-0 flex flex-col justify-center gap-1.5 px-2">
          {[0, 1].map(i => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-1.5 flex-1 rounded-full bg-foreground/15" />
              <span className={`tour-set-switch tour-set-switch-${i} relative h-2.5 w-4 shrink-0 rounded-full bg-border`}>
                <span className="tour-set-knob absolute left-px top-px h-2 w-2 rounded-full bg-card" />
              </span>
            </div>
          ))}
        </div>

        <div className="tour-set-pane tour-set-pane-1 absolute inset-0 flex items-center gap-1.5 px-2">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className={`tour-set-app tour-set-app-${i} h-7 flex-1 rounded-md bg-secondary`} />
          ))}
        </div>

        <div className="tour-set-pane tour-set-pane-2 absolute inset-0 flex flex-col justify-center gap-1.5 px-2">
          <span className="h-1.5 w-3/5 rounded-full bg-foreground/15" />
          <div className="flex gap-1.5">
            <span className="h-3.5 flex-1 rounded-md bg-secondary" />
            <span className="h-3.5 flex-1 rounded-md bg-secondary" />
          </div>
        </div>
      </div>
    </TourFrame>
  )
}
