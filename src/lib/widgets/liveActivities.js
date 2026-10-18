import { toDateKey } from '@/lib/taskReminders'
import { selectActiveAgentRunPill } from '@/store/selectors'
import { buildFocusActivity, buildFocusTemplate } from './focusActivity'
import { buildTodayProjection } from './projection'

const MS_PER_MIN = 60 * 1000
const UP_NEXT_LEAD_MS = 60 * MS_PER_MIN
const DEADLINE_LEAD_MS = 3 * 60 * MS_PER_MIN
const AI_TAB = 'aiAssistant'

function enabledKind(state, kind) {
  return state.settings?.liveActivities?.[kind] !== false
}

function localMs(dayKey, time) {
  if (typeof dayKey !== 'string' || typeof time !== 'string' || !/^\d{2}:\d{2}/.test(time)) return null
  const ms = new Date(`${dayKey.slice(0, 10)}T${time.slice(0, 5)}:00`).getTime()
  return Number.isFinite(ms) ? ms : null
}

function earliest(candidates) {
  return candidates.sort((a, b) => a.atMs - b.atMs)[0] ?? null
}

function focusActivity(state, labels) {
  const focus = buildFocusActivity(state.focusSync, state.settings?.focus, labels)
  if (!focus) return null
  return {
    kind: 'focus',
    id: 'focus',
    title: focus.title,
    subtitle: null,
    tone: focus.phase,
    timer: focus.endsAtMs ? 'countdown' : 'countup',
    countFromMs: focus.countFromMs,
    endsAtMs: focus.endsAtMs,
    pausedAtMs: focus.pausedAtMs,
    taskId: null,
  }
}

function upNextActivity(state, nowMs, labels) {
  const dayKey = toDateKey(new Date(nowMs))
  const next = earliest(buildTodayProjection(state, dayKey)
    .filter(entry => entry.time)
    .map(entry => ({ entry, atMs: localMs(dayKey, entry.time) }))
    .filter(({ atMs }) => atMs !== null && atMs > nowMs && atMs - nowMs <= UP_NEXT_LEAD_MS))
  if (!next) return null
  return {
    kind: 'upNext',
    id: next.entry.id,
    title: next.entry.title,
    subtitle: labels.upNext,
    tone: 'event',
    timer: 'countdown',
    countFromMs: next.atMs - UP_NEXT_LEAD_MS,
    endsAtMs: next.atMs,
    pausedAtMs: null,
    taskId: null,
  }
}

function deadlineActivity(state, nowMs, labels) {
  const next = earliest((state.tasks ?? [])
    .filter(task => !task.done)
    .map(task => ({ task, atMs: localMs(task.dueDate, task.endTime || task.startTime) }))
    .filter(({ atMs }) => atMs !== null && atMs > nowMs && atMs - nowMs <= DEADLINE_LEAD_MS))
  if (!next) return null
  return {
    kind: 'deadline',
    id: next.task.id,
    title: next.task.title ?? '',
    subtitle: labels.dueSoon,
    tone: 'deadline',
    timer: 'countdown',
    countFromMs: next.atMs - DEADLINE_LEAD_MS,
    endsAtMs: next.atMs,
    pausedAtMs: null,
    taskId: next.task.id,
  }
}

const AGENT_TITLES = {
  working: 'agentWorking',
  awaitingConfirm: 'agentConfirm',
  done: 'agentReady',
  failed: 'agentFailed',
  interrupted: 'agentFailed',
}

function agentActivity(state, labels) {
  if (state.currentTab === AI_TAB) return null
  const pill = selectActiveAgentRunPill(state)
  if (!pill) return null
  const run = state.agentRuntime?.runs?.[pill.runId]
  const working = pill.phase === 'working'
  return {
    kind: 'agent',
    id: pill.runId,
    title: labels[AGENT_TITLES[pill.phase]] ?? '',
    subtitle: null,
    tone: pill.phase === 'failed' || pill.phase === 'interrupted' ? 'failed' : 'agent',
    timer: working ? 'countup' : 'none',
    countFromMs: Number.isFinite(run?.createdAt) ? run.createdAt : null,
    endsAtMs: null,
    pausedAtMs: null,
    taskId: null,
  }
}

export function buildLiveActivities(state, nowMs, labels) {
  if (state?.settings?.widgetsEnabled !== true) return []
  const builders = {
    focus: () => focusActivity(state, labels),
    agent: () => agentActivity(state, labels),
    deadline: () => deadlineActivity(state, nowMs, labels),
    upNext: () => upNextActivity(state, nowMs, labels),
  }
  return Object.entries(builders)
    .filter(([kind]) => enabledKind(state, kind))
    .map(([, build]) => build())
    .filter(Boolean)
}

export function buildLiveActivitiesPayload(state, nowMs, labels) {
  const focusAllowed = state?.settings?.widgetsEnabled === true && enabledKind(state, 'focus')
  return {
    activities: buildLiveActivities(state, nowMs, labels),
    focusTemplate: focusAllowed ? buildFocusTemplate(state.settings?.focus, labels) : null,
  }
}
