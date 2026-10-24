import { ZoomIn, ZoomOut, Focus, Maximize2, Minimize2 } from 'lucide-react'

function ZoomButton({ title, onClick, children }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted">
      {children}
    </button>
  )
}

export function ZoomControls({ t, zoom, onZoomOut, onZoomIn, onReset, onFit, fullscreen, onToggleFullscreen }) {
  return (
    <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 z-20 flex items-center gap-0.5 rounded-xl border border-border bg-popover/95 p-1 shadow-sm backdrop-blur">
      <ZoomButton title={t.canvasZoomOut} onClick={onZoomOut}><ZoomOut className="h-4 w-4" /></ZoomButton>
      <button type="button" title={t.canvasZoomReset} onClick={onReset}
        className="h-8 min-w-12 rounded-lg px-1 text-xs tabular-nums text-muted-foreground transition-colors hover:bg-muted">
        {Math.round(zoom * 100)}%
      </button>
      <ZoomButton title={t.canvasZoomIn} onClick={onZoomIn}><ZoomIn className="h-4 w-4" /></ZoomButton>
      <ZoomButton title={t.canvasZoomFit} onClick={onFit}><Focus className="h-4 w-4" /></ZoomButton>
      <ZoomButton title={fullscreen ? t.canvasExitFullscreen : t.canvasFullscreen} onClick={onToggleFullscreen}>
        {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </ZoomButton>
    </div>
  )
}
