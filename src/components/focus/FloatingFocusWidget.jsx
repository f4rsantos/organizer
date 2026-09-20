import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Play, Pause, RotateCcw, PictureInPicture2, MonitorUp } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { useFocusClock } from './useFocusClock'
import { defaultFocus } from './focusTab/constants'
import { fmtTimer } from './focusTab/formatters'
import { FocusWheel } from './focusTab/FocusWheel'
import { clampWidgetPosition, isFocusSessionActive } from '@/lib/focus/floatingWidget'
import {
  focusOverlayAvailable,
  requestOverlayPermission,
  showFocusOverlay,
  updateFocusOverlay,
  hideFocusOverlay,
  addOverlayControlListener,
} from '@/lib/focus/overlayBridge'

const WIDGET_WIDTH = 208
const WIDGET_HEIGHT = 108
const DEFAULT_MARGIN = 16
const WHEEL_MINI_SIZE = 48

function supportsDocumentPip() {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window
}

function defaultPosition() {
  if (typeof window === 'undefined') return { x: DEFAULT_MARGIN, y: DEFAULT_MARGIN }
  return clampWidgetPosition({
    x: window.innerWidth - WIDGET_WIDTH - DEFAULT_MARGIN,
    y: window.innerHeight - WIDGET_HEIGHT - DEFAULT_MARGIN * 4,
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  })
}

function FloatingFocusContent({ t, running, isBreak, label, sublabel, wheelPct, onToggle, onReset, interactive }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="relative shrink-0" style={{ width: WHEEL_MINI_SIZE, height: WHEEL_MINI_SIZE }}>
        <FocusWheel pct={wheelPct} isBreak={isBreak} size={WHEEL_MINI_SIZE} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium tabular-nums">{label}</span>
        <span className="truncate text-xs text-muted-foreground">{sublabel}</span>
      </div>
      {interactive && (
        <div className="flex shrink-0 items-center gap-1">
          {!isBreak && (
            <button
              type="button"
              aria-label={running ? t.focusPause : t.focusResume}
              onPointerDown={e => e.stopPropagation()}
              onPointerUp={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onToggle() }}
              className="rounded-full p-1.5 text-foreground hover:bg-muted"
            >
              {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          )}
          <button
            type="button"
            aria-label={t.focusReset}
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onReset() }}
            className="rounded-full p-1.5 text-foreground hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

function copyDocumentStyles(targetDocument) {
  for (const node of document.querySelectorAll('link[rel="stylesheet"], style')) {
    targetDocument.head.appendChild(node.cloneNode(true))
  }
  const rootClass = document.documentElement.className
  if (rootClass) targetDocument.documentElement.className = rootClass
}

function PipWindow({ onClose, children }) {
  const [pipWindow, setPipWindow] = useState(null)
  const openedRef = useRef(false)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (openedRef.current) return
    openedRef.current = true
    let win = null
    let cancelled = false

    window.documentPictureInPicture.requestWindow({ width: WIDGET_WIDTH + 24, height: WIDGET_HEIGHT + 24 })
      .then(pipWin => {
        if (cancelled) { pipWin.close(); return }
        win = pipWin
        copyDocumentStyles(pipWin.document)
        const style = pipWin.document.createElement('style')
        style.textContent = 'body { margin: 0; }'
        pipWin.document.head.appendChild(style)
        pipWin.addEventListener('pagehide', () => onCloseRef.current(), { once: true })
        setPipWindow(pipWin)
      })
      .catch(() => onCloseRef.current())

    return () => {
      cancelled = true
      win?.close()
    }
  }, [])

  if (!pipWindow) return null
  return createPortal(children, pipWindow.document.body)
}

export function FloatingFocusWidget() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const focus = useStore(s => s.settings?.focus ?? defaultFocus)
  const focusSync = useStore(s => s.focusSync)
  const setActiveTab = useStore(s => s.setActiveTab)

  const active = isFocusSessionActive(focusSync)
  const activeTab = useStore(s => s.currentTab)

  const clock = useFocusClock({
    useInterval: focus.useInterval,
    intervalMins: focus.intervalMins,
    intervalBreakMins: focus.intervalBreakMins,
    useScheduled: focus.useScheduled,
    scheduledBreakMins: focus.scheduledBreakMins,
    scheduledTimes: focus.scheduledTimes,
    intervalResetMode: focus.intervalResetMode ?? 'reset',
  })

  const [position, setPosition] = useState(defaultPosition)
  const [detached, setDetached] = useState(false)
  const [overlayActive, setOverlayActive] = useState(false)
  const [lastActive, setLastActive] = useState(active)
  const dragRef = useRef(null)
  const widgetRef = useRef(null)
  const handleToggleRef = useRef(null)
  const resetRef = useRef(null)

  const pipSupported = useMemo(() => supportsDocumentPip(), [])
  const overlaySupported = useMemo(() => focusOverlayAvailable(), [])

  if (active !== lastActive) {
    setLastActive(active)
    if (!active) {
      setDetached(false)
      setOverlayActive(false)
    }
  }

  useEffect(() => {
    if (!overlaySupported) return undefined
    if (!active || !overlayActive) {
      hideFocusOverlay()
      return undefined
    }
    return addOverlayControlListener(action => {
      if (action === 'toggle') handleToggleRef.current?.()
      if (action === 'reset') resetRef.current?.()
    })
  }, [overlaySupported, active, overlayActive])

  const overlayIsBreak = clock.phase === 'break'
  const overlayLabel = overlayIsBreak ? fmtTimer(clock.breakSecsLeft) : fmtTimer(clock.totalElapsed)

  useEffect(() => {
    handleToggleRef.current = () => {
      if (clock.phase === 'break') return
      if (clock.running) clock.pause()
      else if (clock.totalElapsed === 0) clock.start()
      else clock.resume()
    }
    resetRef.current = clock.reset
  })

  const overlayWasShownRef = useRef(false)

  useEffect(() => {
    if (!overlaySupported || !active || !overlayActive) {
      overlayWasShownRef.current = false
      return
    }
    const payload = { label: overlayLabel, running: clock.running, isBreak: overlayIsBreak }
    if (!overlayWasShownRef.current) {
      overlayWasShownRef.current = true
      showFocusOverlay(payload)
    } else {
      updateFocusOverlay(payload)
    }
  }, [overlaySupported, active, overlayActive, overlayLabel, clock.running, overlayIsBreak])

  useEffect(() => {
    const onResize = () => {
      setPosition(prev => clampWidgetPosition({
        x: prev.x,
        y: prev.y,
        width: WIDGET_WIDTH,
        height: WIDGET_HEIGHT,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handlePointerDown = e => {
    if (e.target.closest('button')) return
    const rect = widgetRef.current.getBoundingClientRect()
    dragRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = e => {
    if (!dragRef.current) return
    dragRef.current.moved = true
    const next = clampWidgetPosition({
      x: e.clientX - dragRef.current.offsetX,
      y: e.clientY - dragRef.current.offsetY,
      width: WIDGET_WIDTH,
      height: WIDGET_HEIGHT,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    })
    setPosition(next)
  }

  const handlePointerUp = () => {
    const wasMoved = dragRef.current?.moved
    dragRef.current = null
    if (!wasMoved) setActiveTab('focus')
  }

  if (!active || activeTab === 'focus') return null

  const { running, phase, cycleElapsed, totalElapsed, breakSecsLeft, scheduledPct, start, pause, resume, reset } = clock
  const isBreak = phase === 'break'

  const focusPct = focus.useInterval
    ? cycleElapsed / (focus.intervalMins * 60)
    : Number.isFinite(scheduledPct) ? scheduledPct : 0

  const breakDenom = focus.useInterval ? focus.intervalBreakMins * 60 : focus.scheduledBreakMins * 60
  const wheelPct = isBreak ? 1 - breakSecsLeft / breakDenom : focusPct

  const label = isBreak ? fmtTimer(breakSecsLeft) : fmtTimer(totalElapsed)
  const sublabel = isBreak ? t.focusBreak : (running ? t.focus : t.focusReady)

  const handleToggle = () => {
    if (isBreak) return
    if (running) pause()
    else if (totalElapsed === 0) start()
    else resume()
  }

  const content = (
    <FloatingFocusContent
      t={t}
      running={running}
      isBreak={isBreak}
      label={label}
      sublabel={sublabel}
      wheelPct={Math.min(1, Math.max(0, wheelPct))}
      onToggle={handleToggle}
      onReset={reset}
      interactive
    />
  )

  const handleRequestOverlay = async () => {
    const granted = await requestOverlayPermission()
    if (granted) setOverlayActive(true)
  }

  return (
    <>
      {!detached && !overlayActive && (
        <div
          ref={widgetRef}
          role="button"
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => { dragRef.current = null }}
          style={{ width: WIDGET_WIDTH, transform: `translate(${position.x}px, ${position.y}px)` }}
          className="fixed left-0 top-0 z-40 cursor-grab touch-none select-none rounded-2xl border border-border bg-card text-card-foreground shadow-xl active:cursor-grabbing"
        >
          {content}
          <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5">
            {overlaySupported && (
              <button
                type="button"
                aria-label={t.focusAlwaysOnTop}
                onPointerDown={e => e.stopPropagation()}
                onPointerUp={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); handleRequestOverlay() }}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <MonitorUp className="h-3 w-3" />
              </button>
            )}
            {pipSupported && (
              <button
                type="button"
                aria-label={t.focusDetach}
                onPointerDown={e => e.stopPropagation()}
                onPointerUp={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setDetached(true) }}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <PictureInPicture2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}
      {detached && pipSupported && (
        <PipWindow onClose={() => setDetached(false)}>
          <div className="h-screen w-screen bg-card text-card-foreground">
            {content}
          </div>
        </PipWindow>
      )}
    </>
  )
}
