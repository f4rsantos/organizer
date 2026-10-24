import {
  FACE_COUNT,
  getPomodoroTimestamp,
  growthFromSecs,
  isPomodoroAggregate,
  pomodoroFocusSecsRaw,
} from '@/components/focus/pomodoro/utils'
import { focusClockConfig, focusTargetSecs } from './focusCycle'

const MAX_TOMATO_TILT_DEG = 20

export function recoveryIntervalSecs(focus) {
  const config = focusClockConfig(focus)
  return focusTargetSecs(config) ?? config.intervalSecs
}

function sumSecs(entries) {
  return entries.reduce((sum, p) => sum + pomodoroFocusSecsRaw(p), 0)
}

function tomato({ id, focusSecs, createdAt, abandoned, colorPct, random }) {
  return {
    id,
    face: Math.floor(random() * FACE_COUNT),
    abandoned,
    pct: growthFromSecs(focusSecs),
    colorPct,
    rotation: random() * MAX_TOMATO_TILT_DEG * 2 - MAX_TOMATO_TILT_DEG,
    createdAt,
    focusSecs,
    recovered: true,
  }
}

function summarize(entries, fallbackSecs) {
  const tomatoes = entries.filter(p => !isPomodoroAggregate(p))
  const completed = tomatoes.filter(p => !p.abandoned)
  const abandoned = tomatoes.filter(p => p.abandoned)
  const tomatoSecs = sumSecs(completed)
  const missingSecs = sumSecs(abandoned)
  const averageSecs = completed.length ? Math.round(tomatoSecs / completed.length) : fallbackSecs
  const addedCount = averageSecs > 0 ? Math.floor(missingSecs / averageSecs) : 0
  return {
    abandoned,
    summary: {
      have: completed.length,
      shouldHave: completed.length + addedCount,
      averageSecs,
      spentSecs: tomatoSecs + missingSecs,
      tomatoSecs,
      missingSecs,
      addedCount,
    },
  }
}

function recoveredTomatoes(abandoned, averageSecs, { makeId, random }) {
  const ordered = [...abandoned].sort((a, b) => getPomodoroTimestamp(a) - getPomodoroTimestamp(b))
  const added = []
  let carried = 0
  let lastAt = 0
  for (const partial of ordered) {
    carried += pomodoroFocusSecsRaw(partial)
    lastAt = getPomodoroTimestamp(partial)
    while (carried >= averageSecs) {
      added.push(tomato({ id: makeId(), focusSecs: averageSecs, createdAt: lastAt, abandoned: false, colorPct: 1, random }))
      carried -= averageSecs
    }
  }
  if (carried <= 0) return added
  const leftover = tomato({ id: makeId(), focusSecs: carried, createdAt: lastAt, abandoned: true, colorPct: carried / averageSecs, random })
  return [...added, leftover]
}

export function planPomodoroRecovery(entries, fallbackSecs, { makeId, random = Math.random }) {
  const { abandoned, summary } = summarize(entries, fallbackSecs)
  if (!summary.addedCount) return { summary, entries }
  const abandonedSet = new Set(abandoned)
  const kept = entries.filter(p => !abandonedSet.has(p))
  return { summary, entries: [...kept, ...recoveredTomatoes(abandoned, summary.averageSecs, { makeId, random })] }
}
