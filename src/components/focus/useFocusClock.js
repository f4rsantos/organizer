import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'

const AWAY_GRACE_SECS = 60

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
    if (!running || startedAt == null) return 0
    return Math.max(0, nowSecs() - startedAt)
  }, [running, startedAt, tick])

  const focusElapsedSinceStart = phase === 'focus'
    ? clampedFocusElapsed({ raw: rawElapsedSinceStart, cycleElapsedBase, intervalSecs, useInterval })
    : rawElapsedSinceStart

  const breakDuration = activeBreakSource === 'interval' ? intervalBreakMins * 60 : scheduledBreakMins * 60

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
    if (!useScheduled || scheduledTimes.length === 0 || phase !== 'focus') return null
    return secsUntilNextBreak(scheduledTimes)
  }, [useScheduled, scheduledTimes, phase, tick])

  const scheduledPct = useMemo(() => {
    if (!useScheduled || scheduledTimes.length === 0 || phase !== 'focus') return null
    return scheduledWindowProgress(scheduledTimes)
  }, [useScheduled, scheduledTimes, phase, tick])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTick(Date.now()), 500)
    return () => clearInterval(id)
  }, [running])

  const commit = useCallback((data) => {
    setFocusSync(data)
  }, [setFocusSync])

  const didReconcileRef = useRef(false)

  const nextTotalBaseAfterBreak = useCallback((savedTotalElapsedBase) => {
    return intervalResetMode === 'continue' ? savedTotalElapsedBase : 0
  }, [intervalResetMode])

  const reconcileAwayGap = useCallback(() => {
    if (!running || startedAt == null) return
    const gap = Math.max(0, nowSecs() - startedAt)

    if (phase === 'focus') {
      if (!useInterval) return
      const remainingToInterval = Math.max(0, intervalSecs - cycleElapsedBase)
      if (gap <= remainingToInterval + breakDuration + AWAY_GRACE_SECS) return
      commit({
        status: 'paused',
        phase: 'focus',
        startedAt: null,
        cycleElapsedBase: 0,
        totalElapsedBase: nextTotalBaseAfterBreak(totalElapsedBase + remainingToInterval),
        breakSecsLeftBase: 0,
        activeBreakSource: null,
      })
      return
    }

    if (gap <= breakSecsLeftBase + AWAY_GRACE_SECS) return
    commit({
      status: 'paused',
      phase: 'focus',
      startedAt: null,
      cycleElapsedBase: 0,
      totalElapsedBase: nextTotalBaseAfterBreak(totalElapsedBase),
      breakSecsLeftBase: 0,
      activeBreakSource: null,
    })
  }, [running, startedAt, phase, useInterval, intervalSecs, cycleElapsedBase, breakDuration, breakSecsLeftBase, totalElapsedBase, nextTotalBaseAfterBreak, commit])

  useEffect(() => {
    if (didReconcileRef.current) return
    didReconcileRef.current = true
    reconcileAwayGap()
  }, [reconcileAwayGap])

  useEffect(() => {
    const onWake = () => { if (document.visibilityState === 'visible') reconcileAwayGap() }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    return () => {
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [reconcileAwayGap])

  useEffect(() => {
    if (!running || phase !== 'break') return
    if (breakSecsLeft > 0) return
    const now = nowSecs()
    commit({
      status: 'started',
      phase: 'focus',
      startedAt: now,
      cycleElapsedBase: 0,
      totalElapsedBase: nextTotalBaseAfterBreak(totalElapsedBase),
      breakSecsLeftBase: 0,
      activeBreakSource: null,
    })
  }, [running, phase, breakSecsLeft, totalElapsedBase, nextTotalBaseAfterBreak, commit])

  useEffect(() => {
    if (!running || phase !== 'focus') return

    if (useScheduled && scheduledTimes.length > 0) {
      const now = new Date()
      const mins = now.getHours() * 60 + now.getMinutes()
      if (scheduledTimes.includes(mins) && cycleElapsed > 0) {
        commit({
          status: 'started',
          phase: 'break',
          startedAt: nowSecs(),
          cycleElapsedBase: cycleElapsed,
          totalElapsedBase: totalElapsed,
          breakSecsLeftBase: scheduledBreakMins * 60,
          activeBreakSource: 'scheduled',
        })
        return
      }
    }

    if (useInterval && cycleElapsed >= intervalSecs) {
      commit({
        status: 'started',
        phase: 'break',
        startedAt: nowSecs(),
        cycleElapsedBase: cycleElapsed,
        totalElapsedBase: totalElapsed,
        breakSecsLeftBase: intervalBreakMins * 60,
        activeBreakSource: 'interval',
      })
    }
  }, [running, phase, useScheduled, scheduledTimes, useInterval, cycleElapsed, totalElapsed, intervalSecs, intervalBreakMins, scheduledBreakMins, commit])

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
