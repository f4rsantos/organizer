import { differenceInCalendarWeeks, isValid, parseISO } from 'date-fns'
import { nanoid } from '../lib/ids'

export const CURRENT_VERSION = 5
export const FREE_BOARD_ID = '__free__'
export const NAV_ADD_ID = '__add__'
export const DEFAULT_TAB_ORDER = ['tasks', 'kanban', 'grades', 'calendar', 'focus', 'settings']
export const STANDBY_PANES = ['wheel', 'wheel-time', 'calendar', 'focus', 'kanban', 'tasks-by-category']

const MIGRATIONS = [
  { toVersion: 2, migrate: migrateV2UnifyTasks },
  { toVersion: 3, migrate: migrateV3SemesterMode },
  { toVersion: 4, migrate: migrateV4Events },
  { toVersion: 5, migrate: migrateV5NavbarStandbyApps },
]

export function migrateState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { state: null, status: 'invalid' }
  }
  let state = { ...raw }
  if (!Number.isFinite(state.version)) state.version = 1
  if (state.version > CURRENT_VERSION) return { state, status: 'newer' }
  const startVersion = state.version
  for (const { toVersion, migrate } of MIGRATIONS) {
    if (state.version < toVersion) state = { ...migrate(state), version: toVersion }
  }
  return { state, status: state.version > startVersion ? 'migrated' : 'ok' }
}

function migrateV2UnifyTasks(state) {
  const tasks = (Array.isArray(state.tasks) ? state.tasks : []).map(taskWithViews)
  const byId = new Map(tasks.map(t => [t.id, t]))
  const orphans = []
  const kanban = {}
  for (const [boardId, board] of Object.entries(state.kanban ?? {})) {
    for (const card of board?.cards ?? []) {
      const target = card?.sourceTaskId ? byId.get(card.sourceTaskId) : null
      if (target) mergeCardIntoTask(target, card)
      else if (card) orphans.push(cardToTask(card, boardId, state.semesters))
    }
    kanban[boardId] = { columns: board?.columns ?? [] }
  }
  return { ...state, tasks: [...tasks, ...orphans], kanban }
}

function taskWithViews(task) {
  const { showOnCalendar, ...rest } = task
  return {
    ...rest,
    views: { list: true, kanban: false, calendar: showOnCalendar !== false },
    kanban: null,
  }
}

function mergeCardIntoTask(task, card) {
  task.views = { ...task.views, kanban: true }
  task.kanban = kanbanBlockFromCard(card)
}

function cardToTask(card, boardId, semesters) {
  const semesterId = boardId === FREE_BOARD_ID ? null : boardId
  const semester = (semesters ?? []).find(s => s.id === semesterId)
  const week = weekFromDueDate(card.dueDate, semester)
  return {
    id: card.id ?? nanoid(),
    semesterId,
    title: card.title ?? '',
    classId: card.classId ?? null,
    priority: card.priority ?? null,
    dueDate: card.dueDate ?? null,
    weekStart: week,
    weekEnd: week,
    done: false,
    views: { list: false, kanban: true, calendar: false },
    kanban: kanbanBlockFromCard(card),
    sharedRef: card.sharedRef ?? null,
    ...(card.sharedTaskId ? { sharedTaskId: card.sharedTaskId } : {}),
  }
}

function kanbanBlockFromCard(card) {
  return {
    columnId: card.columnId ?? null,
    order: Number.isFinite(card.order) ? card.order : 0,
    checklist: normalizeChecklist(card.checklist),
  }
}

function normalizeChecklist(checklist) {
  return (Array.isArray(checklist) ? checklist : []).map(item => ({
    id: item?.id ?? nanoid(),
    text: item?.text ?? '',
    done: Boolean(item?.done),
  }))
}

function weekFromDueDate(dueDate, semester) {
  if (!dueDate || !semester?.startDate) return 1
  const due = parseISO(dueDate)
  const start = parseISO(semester.startDate)
  if (!isValid(due) || !isValid(start)) return 1
  return Math.max(1, differenceInCalendarWeeks(due, start, { weekStartsOn: 1 }) + 1)
}

function migrateV3SemesterMode(state) {
  const settings = { ...(state.settings ?? {}) }
  if (settings.semesterMode !== 'none') settings.semesterMode = 'semesters'
  return { ...state, settings }
}

function migrateV4Events(state) {
  return { ...state, events: Array.isArray(state.events) ? state.events : [] }
}

function normalizeEvent(event) {
  if (!event || typeof event !== 'object') return null
  if (typeof event.date !== 'string' && typeof event.startDate !== 'string') return null
  return {
    id: event.id ?? nanoid(),
    semesterId: typeof event.semesterId === 'string' ? event.semesterId : null,
    title: typeof event.title === 'string' ? event.title : '',
    date: typeof event.date === 'string' ? event.date : null,
    startDate: typeof event.startDate === 'string' ? event.startDate : null,
    endDate: typeof event.endDate === 'string' ? event.endDate : null,
    color: typeof event.color === 'string' ? event.color : null,
    allDay: event.allDay !== false,
    note: typeof event.note === 'string' ? event.note : '',
  }
}

function defaultNavbar() {
  return { order: [...DEFAULT_TAB_ORDER], hidden: [], folders: [], showAddButton: false, labelMode: 'both', addAction: 'task' }
}

function migrateV5NavbarStandbyApps(state) {
  const settings = { ...(state.settings ?? {}) }
  if (!settings.navbar || typeof settings.navbar !== 'object') settings.navbar = defaultNavbar()
  if (!settings.standby || typeof settings.standby !== 'object') settings.standby = defaultStandby()
  if (!settings.apps || typeof settings.apps !== 'object') {
    settings.apps = { collab: settings.collabEnabled === true, notes: false }
  }
  return { ...state, settings, notes: Array.isArray(state.notes) ? state.notes : [] }
}

function normalizeNavbar(navbar) {
  const n = navbar && typeof navbar === 'object' ? navbar : {}
  const known = new Set([...DEFAULT_TAB_ORDER, NAV_ADD_ID, 'notes'])
  const order = (Array.isArray(n.order) ? n.order : []).filter(id => known.has(id))
  for (const id of DEFAULT_TAB_ORDER) if (!order.includes(id)) order.push(id)
  const hidden = (Array.isArray(n.hidden) ? n.hidden : []).filter(id => known.has(id))
  const labelMode = ['both', 'icons', 'names'].includes(n.labelMode) ? n.labelMode : 'both'
  const mobilePosition = ['bottom', 'side'].includes(n.mobilePosition) ? n.mobilePosition : 'bottom'
  const addAction = ['task', 'kanban', 'event', 'note', 'picker'].includes(n.addAction) ? n.addAction : 'task'
  const knownFolderIcons = ['more', 'folder', 'folderOpen', 'star', 'heart', 'bookmark', 'grid']
  const folders = (Array.isArray(n.folders) ? n.folders : [])
    .map(f => (f && typeof f === 'object' ? {
      id: typeof f.id === 'string' ? f.id : nanoid(),
      label: typeof f.label === 'string' ? f.label : 'Folder',
      icon: knownFolderIcons.includes(f.icon) ? f.icon : 'folder',
      children: (Array.isArray(f.children) ? f.children : []).filter(id => known.has(id)),
    } : null))
    .filter(Boolean)
  return { order, hidden, showAddButton: Boolean(n.showAddButton), labelMode, mobilePosition, addAction, folders }
}

function defaultStandby() {
  return { enabled: false, panelCount: 3, panes: ['wheel-time', 'calendar', 'tasks-by-category'] }
}

function normalizeStandby(standby) {
  const s = standby && typeof standby === 'object' ? standby : {}
  const remap = v => (v === 'kanban-simplified' ? 'kanban' : v)
  const pane = (val, fallback) => STANDBY_PANES.includes(remap(val)) ? remap(val) : fallback
  let panes = Array.isArray(s.panes)
    ? s.panes.map(p => pane(p, 'wheel-time'))
    : [pane(s.left, 'wheel-time'), pane(s.center, 'calendar'), pane(s.right, 'tasks-by-category')]
  while (panes.length < 3) panes.push('wheel-time')
  panes = panes.slice(0, 3)
  const panelCount = [1, 2, 3].includes(s.panelCount) ? s.panelCount : 3
  return { enabled: Boolean(s.enabled), panelCount, panes }
}

function normalizeApps(apps, settings) {
  const a = apps && typeof apps === 'object' ? apps : {}
  return { collab: a.collab === true || settings.collabEnabled === true, notes: a.notes === true }
}

function normalizeNote(note) {
  if (!note || typeof note !== 'object') return null
  const kind = ['canvas', 'text'].includes(note.kind) ? note.kind : 'text'
  return {
    id: note.id ?? nanoid(),
    title: typeof note.title === 'string' ? note.title : '',
    kind,
    body: typeof note.body === 'string' ? note.body : '',
    strokes: Array.isArray(note.strokes) ? note.strokes : [],
    favorite: Boolean(note.favorite),
    folderId: typeof note.folderId === 'string' ? note.folderId : null,
    order: Number.isFinite(note.order) ? note.order : 0,
    createdAt: Number.isFinite(note.createdAt) ? note.createdAt : Date.now(),
    updatedAt: Number.isFinite(note.updatedAt) ? note.updatedAt : Date.now(),
  }
}

function normalizeNoteFolder(folder) {
  if (!folder || typeof folder !== 'object') return null
  return {
    id: folder.id ?? nanoid(),
    name: typeof folder.name === 'string' ? folder.name : 'Folder',
    parentId: typeof folder.parentId === 'string' ? folder.parentId : null,
    order: Number.isFinite(folder.order) ? folder.order : 0,
  }
}

function getDefaultFocusSettings() {
  return {
    useInterval: true,
    intervalMins: 25,
    intervalBreakMins: 5,
    useScheduled: false,
    scheduledBreakMins: 5,
    scheduledTimes: [],
    focusLabel: '',
    breakLabel: '',
  }
}

function getDefaultPomodoroSettings() {
  return {
    enabled: false,
    resetPeriod: 'week',
    trackStats: false,
    showAbandoned: true,
    showPeriodStats: true,
  }
}

function getDefaultFocusSync() {
  return {
    status: 'paused',
    phase: 'focus',
    startedAt: null,
    totalElapsedBase: 0,
    cycleElapsedBase: 0,
    breakSecsLeftBase: 0,
    activeBreakSource: null,
    updatedAt: 0,
  }
}

function normalizeTask(task) {
  if (!task || typeof task !== 'object') return null
  const views = task.views && typeof task.views === 'object' ? task.views : {}
  return {
    ...task,
    views: {
      list: views.list !== false,
      kanban: Boolean(views.kanban),
      calendar: views.calendar !== false,
    },
    kanban: task.kanban && typeof task.kanban === 'object'
      ? {
          columnId: task.kanban.columnId ?? null,
          order: Number.isFinite(task.kanban.order) ? task.kanban.order : 0,
          checklist: normalizeChecklist(task.kanban.checklist),
        }
      : null,
  }
}

function normalizeSettings(settings) {
  const s = settings && typeof settings === 'object' ? settings : {}
  s.focus = { ...getDefaultFocusSettings(), ...(typeof s.focus === 'object' && s.focus ? s.focus : {}) }
  s.pomodoro = { ...getDefaultPomodoroSettings(), ...(typeof s.pomodoro === 'object' && s.pomodoro ? s.pomodoro : {}) }
  if (typeof s.kanbanChecklistPreviewMode !== 'string') {
    s.kanbanChecklistPreviewMode = s.kanbanShowChecklistInline ? 'all' : 'none'
  }
  if (!['none', 'all', 'card'].includes(s.kanbanChecklistPreviewMode)) {
    s.kanbanChecklistPreviewMode = 'none'
  }
  if (typeof s.focusAlertMode !== 'string') {
    s.focusAlertMode = s.vibrateOnPageFocus ? 'vibration' : 'none'
  }
  if (typeof s.taskAlertMode !== 'string') {
    s.taskAlertMode = s.taskAlertsEnabled ? 'in-app' : 'none'
  }
  if (typeof s.collabEnabled !== 'boolean') s.collabEnabled = false
  if (!['semesters', 'none'].includes(s.semesterMode)) s.semesterMode = 'semesters'
  s.navbar = normalizeNavbar(s.navbar)
  s.standby = normalizeStandby(s.standby)
  s.apps = normalizeApps(s.apps, s)
  return s
}

function normalizeFocusSync(focusSync) {
  const f = { ...getDefaultFocusSync(), ...(typeof focusSync === 'object' && focusSync ? focusSync : {}) }
  if (f.status !== 'started' && f.status !== 'paused') f.status = 'paused'
  if (f.phase !== 'break' && f.phase !== 'focus') f.phase = 'focus'
  if (!Number.isFinite(f.totalElapsedBase)) f.totalElapsedBase = 0
  if (!Number.isFinite(f.cycleElapsedBase)) f.cycleElapsedBase = 0
  if (!Number.isFinite(f.breakSecsLeftBase)) f.breakSecsLeftBase = 0
  if (!Number.isFinite(f.startedAt)) f.startedAt = null
  if (f.activeBreakSource !== 'interval' && f.activeBreakSource !== 'scheduled') {
    f.activeBreakSource = null
  }
  return f
}

export function normalizeState(state) {
  if (!state || typeof state !== 'object') return null

  if (!Number.isFinite(state.version)) state.version = 1
  if (typeof state.theme !== 'string') state.theme = 'system'
  if (typeof state.lang !== 'string') state.lang = 'pt'
  if (typeof state.onboardingDone !== 'boolean') state.onboardingDone = false
  if (typeof state.activeSemesterId !== 'string' && state.activeSemesterId !== null) state.activeSemesterId = null

  if (!Array.isArray(state.semesters)) state.semesters = []
  if (!Array.isArray(state.classes)) state.classes = []
  state.tasks = (Array.isArray(state.tasks) ? state.tasks : []).map(normalizeTask).filter(Boolean)
  state.events = (Array.isArray(state.events) ? state.events : []).map(normalizeEvent).filter(Boolean)
  state.notes = (Array.isArray(state.notes) ? state.notes : []).map(normalizeNote).filter(Boolean)
  state.noteFolders = (Array.isArray(state.noteFolders) ? state.noteFolders : []).map(normalizeNoteFolder).filter(Boolean)
  if (!state.kanban || typeof state.kanban !== 'object') state.kanban = {}
  if (!state.grades || typeof state.grades !== 'object') state.grades = {}

  state.settings = normalizeSettings(state.settings)

  if (!state.collab || typeof state.collab !== 'object') {
    state.collab = { userId: null, memberships: [] }
  }
  if (!Array.isArray(state.collab.memberships)) state.collab.memberships = []
  if (typeof state.collab.userId !== 'string' && state.collab.userId !== null) state.collab.userId = null

  if (!state.collabRuntime || typeof state.collabRuntime !== 'object') {
    state.collabRuntime = { teams: {} }
  }

  state.focusSync = normalizeFocusSync(state.focusSync)

  if (!Array.isArray(state.pomodoros)) state.pomodoros = []
  if (!state.taskAlertStates || typeof state.taskAlertStates !== 'object') state.taskAlertStates = {}
  if (!state.courseAvg || typeof state.courseAvg !== 'object') {
    state.courseAvg = { previousAvg: null, numSemesters: 0 }
  }
  if (!Number.isFinite(state.courseAvg.numSemesters)) state.courseAvg.numSemesters = 0
  if (!Array.isArray(state.holidays)) state.holidays = []
  if (!state.dismissedNextSemester || typeof state.dismissedNextSemester !== 'object') {
    state.dismissedNextSemester = {}
  }
  if (!state.presetUpdatedAt || typeof state.presetUpdatedAt !== 'object') {
    state.presetUpdatedAt = {}
  }

  return state
}
