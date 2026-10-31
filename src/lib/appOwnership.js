export const CORE_OWNER = 'core'

export const SLICE_OWNERS = {
  activeSemesterId: CORE_OWNER,
  semesters: CORE_OWNER,
  classes: CORE_OWNER,
  tasks: CORE_OWNER,
  events: CORE_OWNER,
  kanban: CORE_OWNER,
  grades: CORE_OWNER,
  settings: CORE_OWNER,
  collab: CORE_OWNER,
  focusSync: CORE_OWNER,
  taskAlertStates: CORE_OWNER,
  courseAvg: CORE_OWNER,
  holidays: CORE_OWNER,
  dismissedNextSemester: CORE_OWNER,
  presetUpdatedAt: CORE_OWNER,
  scheduleImports: CORE_OWNER,
  syncBase: CORE_OWNER,
  notes: 'notes',
  noteFolders: 'notes',
  sharedNoteFolders: 'notes',
  habits: 'habits',
  pomodoros: 'pomodoro',
  breakSudoku: 'breakActivity',
  lessons: 'classesPanel',
  agentJournal: 'aiAssistant',
  agentRuntime: 'aiAssistant',
}

export const SETTINGS_OWNERS = {
  notesCalendarLink: 'notes',
  notesMathEnabled: 'notes',
  notesMathSelectionGraph: 'notes',
  notesMathSolveEquations: 'notes',
  notesMathStepByStep: 'notes',
  notesViewMode: 'notes',
  pomodoro: 'pomodoro',
  standby: 'standby',
  breakActivity: 'breakActivity',
  classesPanel: 'classesPanel',
  todayBrief: 'today',
  'apps.ai': 'aiAssistant',
  'apps.eisenhowerQuadrants': 'eisenhower',
  'apps.quickActionTripleTap': 'quickAction',
  'apps.quickActionShortcut': 'quickAction',
  'apps.quickActionNavbarShortcut': 'quickAction',
}

export const APP_OWNED_SLICES = Object.keys(SLICE_OWNERS).filter(slice => SLICE_OWNERS[slice] !== CORE_OWNER)

function keysOwnedBy(map, appId) {
  return Object.keys(map).filter(key => map[key] === appId)
}

function resetSetting(settings, path, initialSettings) {
  const [head, tail] = path.split('.')
  if (!tail) return { ...settings, [head]: initialSettings?.[head] }
  const nested = { ...(settings?.[head] ?? {}) }
  delete nested[tail]
  return { ...settings, [head]: nested }
}

export function wipeOwnedData(state, appId, initialState) {
  const slices = Object.fromEntries(keysOwnedBy(SLICE_OWNERS, appId).map(slice => [slice, initialState?.[slice] ?? null]))
  const settings = keysOwnedBy(SETTINGS_OWNERS, appId)
    .reduce((acc, path) => resetSetting(acc, path, initialState?.settings), state.settings ?? {})
  return { ...state, ...slices, settings }
}
