import { focusClockConfig, focusTargetSecs, nextFocusTransition } from '@/lib/focus/focusCycle'

const MS_PER_SEC = 1000

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback
}

function titleFor(phase, focusSettings, labels) {
  return phase === 'break'
    ? (focusSettings?.breakLabel || labels.breakPhase)
    : (focusSettings?.focusLabel || labels.focusPhase)
}

function runningActivity(focusSync, phase, config) {
  const elapsedBase = phase === 'focus' ? finiteOr(focusSync.cycleElapsedBase, 0) : 0
  const transition = nextFocusTransition(focusSync, config)
  return {
    countFromMs: (focusSync.startedAt - elapsedBase) * MS_PER_SEC,
    endsAtMs: transition ? transition.at * MS_PER_SEC : null,
    pausedAtMs: null,
  }
}

function pausedActivity(focusSync, phase, config) {
  const pausedAtMs = finiteOr(focusSync.updatedAt, 0)
  if (pausedAtMs <= 0) return null
  if (phase === 'break') {
    const left = finiteOr(focusSync.breakSecsLeftBase, 0)
    if (left <= 0) return null
    return { countFromMs: pausedAtMs, endsAtMs: pausedAtMs + left * MS_PER_SEC, pausedAtMs }
  }
  const elapsed = finiteOr(focusSync.cycleElapsedBase, 0)
  if (elapsed <= 0) return null
  const countFromMs = pausedAtMs - elapsed * MS_PER_SEC
  const target = focusTargetSecs(config)
  return { countFromMs, endsAtMs: target ? countFromMs + target * MS_PER_SEC : null, pausedAtMs }
}

export function buildFocusActivity(focusSync, focusSettings, labels) {
  if (!focusSync) return null
  const phase = focusSync.phase === 'break' ? 'break' : 'focus'
  const config = focusClockConfig(focusSettings)
  const running = focusSync.status === 'started' && Number.isFinite(focusSync.startedAt)
  const timing = running ? runningActivity(focusSync, phase, config) : pausedActivity(focusSync, phase, config)
  if (!timing) return null
  return { phase, title: titleFor(phase, focusSettings, labels), ...timing }
}

export function buildFocusTemplate(focusSettings, labels) {
  return {
    title: titleFor('focus', focusSettings, labels),
    targetSecs: focusTargetSecs(focusClockConfig(focusSettings)),
  }
}
