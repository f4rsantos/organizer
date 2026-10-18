import { nanoid } from '../ids.js'
import { getWeekContext } from '../weekContext.js'
import { currentPeriodKey, isCheckedIn } from '../habits.js'
import { FREE_BOARD_ID } from '../taskUtils.js'
import { sortByOrder } from '../utils.js'
import { focusCommandPatch, gradeComponentsAfter } from './commands.js'
import { findBestHabit, findBestTask } from './matchTargets.js'

const DEFAULT_COLUMNS = [
  { id: 'col_todo', title: 'To Do', order: 0 },
  { id: 'col_inprogress', title: 'In Progress', order: 1 },
  { id: 'col_done', title: 'Done', order: 2 },
]

function scopeOf(state) {
  const mode = state.settings?.semesterMode ?? 'semesters'
  const semester = mode === 'none' ? null : (state.semesters ?? []).find(s => s.id === state.activeSemesterId) ?? null
  return { mode, semester, semesterId: mode === 'none' ? null : semester?.id ?? null }
}

function weekResolver(weekCtx) {
  return (dateStr, explicitWeek) => {
    const clamp = w => Math.max(1, Math.min(weekCtx.weekCount || w, w))
    if (Number.isFinite(explicitWeek)) return clamp(explicitWeek)
    const week = dateStr ? weekCtx.dateToWeek(dateStr) : null
    if (!Number.isFinite(week)) return weekCtx.currentWeek ?? 1
    return clamp(week)
  }
}

export function quickActionScope(state) {
  const { mode, semester, semesterId } = scopeOf(state)
  const columns = sortByOrder(state.kanban?.[semesterId ?? FREE_BOARD_ID]?.columns ?? DEFAULT_COLUMNS)
  const classes = (state.classes ?? []).filter(c => c.semesterId === semesterId)
  return { semesterId, columns, classes, resolveWeek: weekResolver(getWeekContext({ mode, semester })) }
}

export function storeQuickActionContext(store, { t, now, newId = nanoid, tasks = null, shared = null }) {
  const state = store.getState()
  return {
    t,
    now,
    newId,
    shared,
    actions: state,
    read: () => store.getState(),
    tasks: () => tasks ?? store.getState().tasks ?? [],
    ...quickActionScope(state),
  }
}

function runNavigation(item, ctx, effects) {
  ctx.actions.setActiveTab(item.target)
  effects.push({ type: 'navigate', target: item.target })
}

function runFocus(item, ctx, effects) {
  const patch = focusCommandPatch(item, ctx.read().focusSync, Math.floor(ctx.now.getTime() / 1000))
  if (patch.settings) ctx.actions.updateFocusSettings(patch.settings)
  if (patch.sync) ctx.actions.setFocusSync(patch.sync)
  effects.push({ type: 'focus', action: item.action })
}

function runGrade(item, ctx, effects) {
  if (!ctx.semesterId || !item.classId) return
  const before = ctx.read().grades?.[ctx.semesterId]?.[item.classId]?.components ?? []
  const next = gradeComponentsAfter(item, before, ctx.newId)
  if (!next) return
  ctx.actions.setGradeComponents(ctx.semesterId, item.classId, next)
  effects.push({ type: 'grade', semesterId: ctx.semesterId, classId: item.classId, before })
}

function runNote(item, ctx, effects) {
  if (item.type === 'addFolder') {
    ctx.actions.addNoteFolder(item.name || ctx.t.notesNewFolder)
    ctx.actions.setActiveTab('notes')
    effects.push({ type: 'navigate', target: 'notes' })
    return
  }
  if (item.type !== 'addNote') return
  const id = ctx.newId()
  ctx.actions.addNote({ id, kind: 'text', title: item.title || '' })
  ctx.actions.setActiveTab('notes')
  effects.push({ type: 'create', entity: 'note', id, title: item.title || '' })
}

function runHabitMutation(item, habit, ctx, effects) {
  const periodKey = currentPeriodKey(habit, ctx.now)
  if (periodKey === null) return
  if (item.action === 'complete') {
    if (isCheckedIn(habit, periodKey)) return
    ctx.actions.checkInHabit(habit.id, periodKey, item.note ?? '')
    effects.push({ type: 'habit', habitId: habit.id, periodKey, title: habit.title })
    return
  }
  if (item.action === 'undo') {
    ctx.actions.undoHabitCheckIn(habit.id, periodKey)
    effects.push({ type: 'habitUndo', habitId: habit.id, title: habit.title })
  }
}

function sharedMutation(item, remote, ctx) {
  const ref = { teamId: remote.teamId, sharedCardId: remote.sharedCardId }
  const shared = ctx.shared
  if (!shared) return false
  if (item.action === 'complete') shared.updateSharedCard({ ...ref, patch: { done: true } })
  else if (item.action === 'delete') shared.deleteSharedCard(ref)
  else if (item.action === 'move' && item.columnId) shared.moveSharedCard({ ...ref, targetColumnId: item.columnId })
  else if (item.action === 'assign' && item.memberId) shared.updateSharedCard({ ...ref, patch: { assigneeUserId: item.memberId } })
  else return false
  return true
}

function localTaskPatch(item, task) {
  if (item.action === 'complete') return { done: true }
  if (item.action === 'move' && item.columnId) return { kanban: { ...task.kanban, columnId: item.columnId } }
  if (item.action === 'share' && item.teamId) return { teamId: item.teamId }
  if (item.action === 'assign' && item.memberId) return { assigneeUserId: item.memberId }
  return null
}

function runTaskMutation(item, task, ctx, effects) {
  const remote = task.sharedMeta?.remote ? task.sharedMeta : null
  if (remote) {
    if (sharedMutation(item, remote, ctx)) effects.push({ type: 'shared', action: item.action, title: task.title })
    return
  }
  const before = ctx.read().tasks.find(t => t.id === task.id) ?? task
  if (item.action === 'delete') {
    ctx.actions.deleteTask(task.id)
    effects.push({ type: 'remove', entity: 'task', id: task.id, before, title: task.title })
    return
  }
  const patch = localTaskPatch(item, task)
  if (!patch) return
  ctx.actions.updateTask(task.id, patch)
  effects.push({ type: 'update', entity: 'task', id: task.id, before, action: item.action, title: task.title })
}

export function mutationTarget(item, ctx) {
  const apps = ctx.read().settings?.apps ?? {}
  const habits = ctx.read().habits ?? []
  const habitsEnabled = apps.habits === true
  const habitOnly = item.action === 'undo' || item.habitScoped
  if (habitsEnabled && habitOnly) {
    const habit = findBestHabit(habits, item.query, ctx.now)
    return habit ? { kind: 'habit', habit } : null
  }
  const task = findBestTask(ctx.tasks(), item.query, ctx.now)
  if (task) return { kind: 'task', task }
  const habit = habitsEnabled ? findBestHabit(habits, item.query, ctx.now) : null
  return habit ? { kind: 'habit', habit } : null
}

function runMutation(item, ctx, effects) {
  const target = mutationTarget(item, ctx)
  if (target?.kind === 'habit') runHabitMutation(item, target.habit, ctx, effects)
  if (target?.kind === 'task') runTaskMutation(item, target.task, ctx, effects)
}

function taskPayload(item, ctx) {
  const week = ctx.resolveWeek(item.date, item.week)
  return {
    semesterId: ctx.semesterId,
    title: item.title || ctx.t.task,
    classId: item.classId,
    priority: item.priority ?? null,
    dueDate: item.date,
    startTime: item.startTime,
    endTime: item.endTime,
    weekStart: week,
    weekEnd: week,
    teamId: item.teamId ?? null,
    recurrence: item.recurrence ?? null,
    duration: item.duration ?? null,
  }
}

function runCreate(item, ctx, effects) {
  const id = ctx.newId()
  if (item.kind === 'event') {
    ctx.actions.addEvent({
      id,
      title: item.title || ctx.t.newEvent,
      semesterId: ctx.semesterId,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      allDay: !item.startTime,
      teamId: item.teamId ?? null,
      recurrence: item.recurrence ?? null,
    })
    effects.push({ type: 'create', entity: 'event', id, title: item.title })
    return
  }
  const views = item.kind === 'kanbanCard'
    ? { list: false, kanban: true, calendar: false }
    : { list: true, kanban: false, calendar: Boolean(item.showOnCalendar) }
  const kanban = item.kind === 'kanbanCard' ? { kanban: { columnId: item.columnId, order: 0, checklist: [] } } : {}
  ctx.actions.addTask({ id, ...taskPayload(item, ctx), views, ...kanban })
  effects.push({ type: 'create', entity: 'task', id, title: item.title })
}

const HANDLERS = {
  navigation: runNavigation,
  focus: runFocus,
  gradeAction: runGrade,
  noteAction: runNote,
  mutation: runMutation,
}

function summarize(effects) {
  return {
    created: effects.filter(e => e.type === 'create').length,
    updated: effects.filter(e => e.type === 'update' || e.type === 'habit' || e.type === 'grade' || e.type === 'shared').length,
    removed: effects.filter(e => e.type === 'remove').length,
  }
}

export function executeQuickAction(items, ctx) {
  const effects = []
  for (const item of items) (HANDLERS[item.kind] ?? runCreate)(item, ctx, effects)
  return { effects, summary: summarize(effects) }
}

const UNDOABLE = new Set(['create', 'update', 'remove', 'habit', 'grade'])

export function canUndo(effects) {
  return (effects ?? []).some(e => UNDOABLE.has(e.type))
}

function undoEffect(effect, actions) {
  if (effect.type === 'create' && effect.entity === 'task') actions.removeTasks([effect.id])
  if (effect.type === 'create' && effect.entity === 'event') actions.deleteEvent(effect.id)
  if (effect.type === 'create' && effect.entity === 'note') actions.deleteNote(effect.id)
  if (effect.type === 'update' || effect.type === 'remove') actions.restoreTask(effect.before)
  if (effect.type === 'habit') actions.undoHabitCheckIn(effect.habitId, effect.periodKey)
  if (effect.type === 'grade') actions.setGradeComponents(effect.semesterId, effect.classId, effect.before)
}

export function undoQuickAction(effects, ctx) {
  ;[...(effects ?? [])].reverse().forEach(effect => undoEffect(effect, ctx.actions))
}
