import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useNotify } from '@/hooks/useNotify'
import { useStrings as stringsFor } from '@/lib/strings'
import { AWAY_GRACE_SECS, advanceFocusClock, nextFocusTransition, totalAfterBreak } from '@/lib/focus/focusCycle'
import { scheduleWake } from '@/lib/focus/wakeTimer'

const UNATTENDED_GAP_SECS = 3 * 60
const PHASE_ALERT_EVENTS = ['breakStarted', 'focusStarted']
let lastAdvancedAtSecs = null

function nowSecs() { return Math.floor(Date.now() / 1000) }

function clampedFocusElapsed({ raw, cycleElapsedBase, intervalSecs, useInterval }) {
  if (!useInterval) return raw
  return Math.min(raw, Math.max(0, intervalSecs - cycleElapsedBase))
}

function nextScheduledBreak(times) {
  if (!times.length) return null
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const sorted = [...times].sort((a, b) => a - b)
  return sorted.find(t => t > cur) ?? sorted[0]
}

function secsUntilNextBreak(times) {
  const next = nextScheduledBreak(times)
  if (!next) return null
  const now = new Date()
  const nowSecsOfDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  let nextSecsOfDay = next * 60
  if (nextSecsOfDay <= nowSecsOfDay) nextSecsOfDay += 24 * 3600
  return Math.max(0, nextSecsOfDay - nowSecsOfDay)
}

function scheduledWindowProgress(times) {
  if (!Array.isArray(times) || times.length === 0) return null

  const sorted = [...times].sort((a, b) => a - b)
  const now = new Date()
  const nowSecsOfDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  const slots = sorted.map(mins => mins * 60)

  let nextIndex = slots.findIndex(slotSecs => slotSecs > nowSecsOfDay)
  if (nextIndex === -1) nextIndex = 0

  const prevIndex = (nextIndex - 1 + slots.length) % slots.length
  let prevSecs = slots[prevIndex]
  let nextSecs = slots[nextIndex]

  if (nextSecs <= nowSecsOfDay) nextSecs += 24 * 3600
  if (prevSecs > nowSecsOfDay) prevSecs -= 24 * 3600

  const span = Math.max(1, nextSecs - prevSecs)
  const elapsed = Math.min(span, Math.max(0, nowSecsOfDay - prevSecs))
  return elapsed / span
}

export function useFocusClock({ useInterval, intervalMins, intervalBreakMins, useScheduled, scheduledBreakMins, scheduledTimes, intervalResetMode }) {
  const focusSync = useStore(s => s.focusSync)
  const setFocusSync = useStore(s => s.setFocusSync)
  const recordFocusTomato = useStore(s => s.recordFocusTomato)
  const alertsEnabled = useStore(s => s.settings?.focus?.alertsEnabled ?? true)
  const lang = useStore(s => s.lang ?? 'en')
  const notify = useNotify()
  const [tick, setTick] = useState(0)

  const intervalSecs = intervalMins * 60
  const status = focusSync?.status === 'started' ? 'started' : 'paused'
  const running = status === 'started'
  const phase = focusSync?.phase === 'break' ? 'break' : 'focus'
  const startedAt = Number.isFinite(focusSync?.startedAt) ? focusSync.startedAt : null
  const totalElapsedBase = Number.isFinite(focusSync?.totalElapsedBase) ? focusSync.totalElapsedBase : 0
  const cycleElapsedBase = Number.isFinite(focusSync?.cycleElapsedBase) ? focusSync.cycleElapsedBase : 0
  const breakSecsLeftBase = Number.isFinite(focusSync?.breakSecsLeftBase) ? focusSync.breakSecsLeftBase : 0
  const activeBreakSource =
    focusSync?.activeBreakSource === 'interval' || focusSync?.activeBreakSource === 'scheduled'
      ? focusSync.activeBreakSource
      : null

  const rawElapsedSinceStart = useMemo(() => {
    void tick
    if (!running || startedAt == null) return 0
    return Math.max(0, nowSecs() - startedAt)
  }, [running, startedAt, tick])

  const focusElapsedSinceStart = phase === 'focus'
    ? clampedFocusElapsed({ raw: rawElapsedSinceStart, cycleElapsedBase, intervalSecs, useInterval })
    : rawElapsedSinceStart

  const cycleElapsed = phase === 'focus'
    ? cycleElapsedBase + focusElapsedSinceStart
    : 0

  const totalElapsed = phase === 'focus'
    ? totalElapsedBase + focusElapsedSinceStart
    : totalElapsedBase

  const breakSecsLeft = phase === 'break'
    ? (running ? Math.max(0, breakSecsLeftBase - rawElapsedSinceStart) : breakSecsLeftBase)
    : 0

  const secsToNextBreak = useMemo(() => {
    void tick
    if (!useScheduled || scheduledTimes.length === 0 || phase !== 'focus') return null
    return secsUntilNextBreak(scheduledTimes)
  }, [useScheduled, scheduledTimes, phase, tick])

  const scheduledPct = useMemo(() => {
    void tick
    if (!useScheduled || scheduledTimes.length === 0 || phase !== 'focus') return null
    return scheduledWindowProgress(scheduledTimes)
  }, [useScheduled, scheduledTimes, phase, tick])

  const clockConfig = useMemo(() => ({
    useInterval,
    intervalSecs,
    intervalBreakSecs: intervalBreakMins * 60,
    useScheduled,
    scheduledTimes,
    scheduledBreakSecs: scheduledBreakMins * 60,
    resetMode: intervalResetMode,
  }), [useInterval, intervalSecs, intervalBreakMins, useScheduled, scheduledTimes, scheduledBreakMins, intervalResetMode])

  const commit = useCallback((data) => {
    setFocusSync(data)
  }, [setFocusSync])

  const nextTotalBaseAfterBreak = useCallback((savedTotalElapsedBase) => {
    return totalAfterBreak(savedTotalElapsedBase, intervalResetMode)
  }, [intervalResetMode])

  const announcePhase = useCallback((event, now) => {
    if (!alertsEnabled || !PHASE_ALERT_EVENTS.includes(event?.type)) return
    if (now - event.at > AWAY_GRACE_SECS) return
    const t = stringsFor(lang)
    notify({
      tag: 'organiser-focus-alert',
      title: t.focusNotifTitle,
      body: event.type === 'breakStarted' ? t.focusNotifBreakBody : t.focusNotifFocusBody,
    }, { vibratePattern: event.type === 'breakStarted' ? [22, 55, 22] : 24 })
  }, [alertsEnabled, lang, notify])

  const advance = useCallback(() => {
    const now = nowSecs()
    const unattended = lastAdvancedAtSecs === null || now - lastAdvancedAtSecs > UNATTENDED_GAP_SECS
    lastAdvancedAtSecs = now
    const { state, events } = advanceFocusClock(useStore.getState().focusSync, now, clockConfig, { unattended })
    if (!events.length) return
    events.forEach(event => {
      if (event.completedFocus) recordFocusTomato(event.completedFocus)
    })
    commit(state)
    announcePhase(events[events.length - 1], now)
  }, [clockConfig, recordFocusTomato, commit, announcePhase])

  const nextTransitionAt = useMemo(
    () => nextFocusTransition(focusSync, clockConfig)?.at ?? null,
    [focusSync, clockConfig],
  )

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setTick(Date.now())
      advance()
    }, 500)
    return () => clearInterval(id)
  }, [running, advance])

  useEffect(() => {
    advance()
  }, [advance])

  useEffect(() => {
    if (nextTransitionAt === null) return
    return scheduleWake(nextTransitionAt * 1000, advance)
  }, [nextTransitionAt, advance])

  useEffect(() => {
    const onWake = () => { if (document.visibilityState === 'visible') advance() }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    return () => {
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [advance])

  const start = () => {
    commit({
      status: 'started',
      phase: 'focus',
      startedAt: nowSecs(),
      totalElapsedBase: 0,
      cycleElapsedBase: 0,
      breakSecsLeftBase: 0,
      activeBreakSource: null,
    })
  }

  const pause = () => {
    if (!running || startedAt == null) return
    const now = nowSecs()
    const elapsed = Math.max(0, now - startedAt)

    if (phase === 'focus') {
      commit({
        status: 'paused',
        startedAt: null,
        totalElapsedBase: totalElapsedBase + elapsed,
        cycleElapsedBase: cycleElapsedBase + elapsed,
      })
      return
    }

    commit({
      status: 'paused',
      startedAt: null,
      breakSecsLeftBase: Math.max(0, breakSecsLeftBase - elapsed),
    })
  }

  const resume = () => {
    if (running) return
    commit({
      status: 'started',
      startedAt: nowSecs(),
    })
  }

  const reset = () => {
    commit({
      status: 'paused',
      phase: 'focus',
      startedAt: null,
      totalElapsedBase: 0,
      cycleElapsedBase: 0,
      breakSecsLeftBase: 0,
      activeBreakSource: null,
    })
  }

  const skipBreak = () => {
    if (phase !== 'break') return
    commit({
      phase: 'focus',
      startedAt: running ? nowSecs() : null,
      cycleElapsedBase: 0,
      totalElapsedBase: nextTotalBaseAfterBreak(totalElapsedBase),
      breakSecsLeftBase: 0,
      activeBreakSource: null,
    })
  }

  return {
    running, phase, cycleElapsed, totalElapsed, breakSecsLeft, secsToNextBreak, scheduledPct, activeBreakSource,
    start, pause, resume, reset, skipBreak,
    nextScheduled: useScheduled ? nextScheduledBreak(scheduledTimes) : null,
  }
}
