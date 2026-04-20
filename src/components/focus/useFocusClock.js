import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'

function nowSecs() { return Math.floor(Date.now() / 1000) }

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
  const curMins = now.getHours() * 60 + now.getMinutes()
  const curSecs = now.getSeconds()
  const diffMins = next - curMins
  const secsInCurrentMin = 60 - curSecs
  return Math.max(0, diffMins * 60 + secsInCurrentMin)
}

export function useFocusClock({ useInterval, intervalMins, intervalBreakMins, useScheduled, scheduledBreakMins, scheduledTimes }) {
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

  const elapsedSinceStart = useMemo(() => {
    if (!running || startedAt == null) return 0
    return Math.max(0, nowSecs() - startedAt)
  }, [running, startedAt, tick])

  const breakDuration = activeBreakSource === 'interval' ? intervalBreakMins * 60 : scheduledBreakMins * 60

  const cycleElapsed = phase === 'focus'
    ? cycleElapsedBase + elapsedSinceStart
    : 0

  const totalElapsed = phase === 'focus'
    ? totalElapsedBase + elapsedSinceStart
    : totalElapsedBase

  const breakSecsLeft = phase === 'break'
    ? (running ? Math.max(0, breakSecsLeftBase - elapsedSinceStart) : breakSecsLeftBase)
    : 0

  const secsToNextBreak = useMemo(() => {
    if (!useScheduled || scheduledTimes.length === 0 || phase !== 'focus') return null
    return secsUntilNextBreak(scheduledTimes)
  }, [useScheduled, scheduledTimes, phase, tick])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTick(Date.now()), 500)
    return () => clearInterval(id)
  }, [running])

  const commit = useCallback((data) => {
    setFocusSync(data)
  }, [setFocusSync])

  useEffect(() => {
    if (!running || phase !== 'break') return
    if (breakSecsLeft > 0) return
    const now = nowSecs()
    commit({
      status: 'started',
      phase: 'focus',
      startedAt: now,
      cycleElapsedBase: 0,
      totalElapsedBase,
      breakSecsLeftBase: 0,
      activeBreakSource: null,
    })
  }, [running, phase, breakSecsLeft, totalElapsedBase, commit])

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
          cycleElapsedBase: 0,
          totalElapsedBase,
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
        cycleElapsedBase: 0,
        totalElapsedBase,
        breakSecsLeftBase: intervalBreakMins * 60,
        activeBreakSource: 'interval',
      })
    }
  }, [running, phase, useScheduled, scheduledTimes, useInterval, cycleElapsed, intervalSecs, intervalBreakMins, scheduledBreakMins, totalElapsedBase, commit])

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
      breakSecsLeftBase: 0,
      activeBreakSource: null,
    })
  }

  return {
    running, phase, cycleElapsed, totalElapsed, breakSecsLeft, secsToNextBreak, activeBreakSource,
    start, pause, resume, reset, skipBreak,
    nextScheduled: useScheduled ? nextScheduledBreak(scheduledTimes) : null,
  }
}
