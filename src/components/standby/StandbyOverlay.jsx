import { useStore } from '@/store/useStore'
import { StandbyPane } from './StandbyPanes'

export function StandbyOverlay() {
  const standby = useStore(s => s.settings?.standby)
  const count = standby?.panelCount ?? 3
  const panes = (standby?.panes ?? ['wheel-time', 'calendar', 'tasks-by-category']).slice(0, count)

  return (
    <div className="fixed inset-0 z-[100] bg-background flex">
      {panes.map((pane, i) => (
        <div key={i} className="flex-1 flex items-center justify-center border-r border-border/40 last:border-r-0 p-4 overflow-hidden">
          <StandbyPane pane={pane} />
        </div>
      ))}
    </div>
  )
}
