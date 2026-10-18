const DEFAULT_COMPONENT_WEIGHT = 0.25

const FRESH_FOCUS = {
  status: 'started',
  phase: 'focus',
  totalElapsedBase: 0,
  cycleElapsedBase: 0,
  breakSecsLeftBase: 0,
  activeBreakSource: null,
}

function startPatch(cmd, sync, nowSecs) {
  const running = sync?.status === 'started'
  const settings = cmd.workMins || cmd.breakMins
    ? {
        ...(cmd.workMins ? { intervalMins: cmd.workMins } : {}),
        ...(cmd.breakMins ? { intervalBreakMins: cmd.breakMins } : {}),
      }
    : null
  if (cmd.action === 'resume' && running) return { settings, sync: null }
  const hasBanked = Boolean(sync?.totalElapsedBase || sync?.cycleElapsedBase)
  if (cmd.action === 'resume' && sync?.startedAt == null && hasBanked) {
    return { settings, sync: { status: 'started', startedAt: nowSecs } }
  }
  return { settings, sync: { ...FRESH_FOCUS, startedAt: nowSecs } }
}

function pausePatch(sync, nowSecs) {
  if (sync?.status !== 'started' || sync?.startedAt == null) return null
  const elapsed = Math.max(0, nowSecs - sync.startedAt)
  if (sync.phase === 'break') {
    return { status: 'paused', startedAt: null, breakSecsLeftBase: Math.max(0, (sync.breakSecsLeftBase ?? 0) - elapsed) }
  }
  return {
    status: 'paused',
    startedAt: null,
    totalElapsedBase: (sync.totalElapsedBase ?? 0) + elapsed,
    cycleElapsedBase: (sync.cycleElapsedBase ?? 0) + elapsed,
  }
}

function skipBreakPatch(sync, nowSecs) {
  if (sync?.phase !== 'break') return null
  return {
    phase: 'focus',
    startedAt: sync.status === 'started' ? nowSecs : null,
    cycleElapsedBase: 0,
    breakSecsLeftBase: 0,
    activeBreakSource: null,
  }
}

export function focusCommandPatch(cmd, sync, nowSecs) {
  if (cmd.action === 'start' || cmd.action === 'resume') return startPatch(cmd, sync, nowSecs)
  if (cmd.action === 'pause') return { settings: null, sync: pausePatch(sync, nowSecs) }
  if (cmd.action === 'reset') return { settings: null, sync: { ...FRESH_FOCUS, status: 'paused', startedAt: null } }
  if (cmd.action === 'skipBreak') return { settings: null, sync: skipBreakPatch(sync, nowSecs) }
  return { settings: null, sync: null }
}

function findComponent(components, name) {
  const wanted = (name ?? '').toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!wanted.length) return null
  return components.find(c => {
    const words = (c.name ?? '').toLowerCase().split(/\s+/)
    return wanted.every(w => words.includes(w))
  }) ?? null
}

export function gradeComponentsAfter(cmd, components, newId) {
  const match = findComponent(components, cmd.componentName)
  if (cmd.type === 'addComponent') {
    if (match) {
      return components.map(c => c.id === match.id ? { ...c, ...(cmd.weight != null ? { weight: cmd.weight } : {}) } : c)
    }
    return [...components, { id: newId(), name: cmd.componentName, weight: cmd.weight ?? DEFAULT_COMPONENT_WEIGHT, grade: null }]
  }
  if (cmd.type !== 'setGrade') return null
  if (match) return components.map(c => c.id === match.id ? { ...c, grade: cmd.grade, subcomponents: undefined } : c)
  if (!cmd.componentName) return null
  return [...components, { id: newId(), name: cmd.componentName, weight: DEFAULT_COMPONENT_WEIGHT, grade: cmd.grade }]
}
