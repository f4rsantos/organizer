import { create } from 'zustand'
import { nanoid } from '@/lib/ids'
import { loadState, saveState } from './persist'
import { CURRENT_VERSION, migrateState, normalizeState } from './migrations'
import { FREE_BOARD_ID, boardIdForTask } from '@/lib/taskUtils'
import { getWeekContext, remapTaskWeeks } from '@/lib/weekContext'

const DEFAULT_COLUMNS = [
  { id: 'col_todo', title: 'To Do', order: 0 },
  { id: 'col_inprogress', title: 'In Progress', order: 1 },
  { id: 'col_done', title: 'Done', order: 2 },
]

function sortedColumns(state, boardId) {
  const cols = state.kanban?.[boardId]?.columns ?? DEFAULT_COLUMNS
  return [...cols].sort((a, b) => a.order - b.order)
}
function doneColumnIdFor(state, boardId) {
  const cols = sortedColumns(state, boardId)
  return cols[cols.length - 1]?.id ?? null
}
function firstColumnIdFor(state, boardId) {
  return sortedColumns(state, boardId)[0]?.id ?? null
}

function buildInitialState() {
  const saved = loadState()
  if (saved) return saved
  return {
    version: CURRENT_VERSION,
    theme: 'system',
    lang: 'pt',
    onboardingDone: false,
    activeTab: null,
    activeSemesterId: null,
    semesters: [],
    classes: [],
    tasks: [],
    events: [],
    notes: [],
    noteFolders: [],
    kanban: {},
    grades: {},
    settings: {
      defaultWeekRangeSpan: 1,
      passThreshold: 9.5,
      taskSpanMode: 'single',
      kanbanShowChecklistInline: false,
      kanbanChecklistPreviewMode: 'none',
      focusAlertMode: 'none',
      taskAlertMode: 'none',
      taskDefaultToCalendar: false,
      focus: {
        useInterval: true, intervalMins: 25, intervalBreakMins: 5,
        useScheduled: false, scheduledBreakMins: 5, scheduledTimes: [],
        focusLabel: '', breakLabel: '',
        intervalResetMode: 'reset',
      },
      pomodoro: {
        enabled: false,
        resetPeriod: 'week',
        trackStats: false,
        showAbandoned: true,
        showPeriodStats: true,
      },
      collabEnabled: false,
      workMode: false,
      semesterMode: 'semesters',
      navbar: { order: ['tasks', 'kanban', 'grades', 'calendar', 'focus', 'settings'], hidden: [], folders: [], showAddButton: false, labelMode: 'both', addAction: 'task' },
      standby: { enabled: false, panelCount: 3, panes: ['wheel-time', 'calendar', 'tasks-by-category'] },
      apps: { collab: false, notes: false },
    },
    collab: {
      userId: null,
      memberships: [],
    },
    collabRuntime: {
      teams: {},
    },
    focusSync: {
      status: 'paused',
      phase: 'focus',
      startedAt: null,
      totalElapsedBase: 0,
      cycleElapsedBase: 0,
      breakSecsLeftBase: 0,
      activeBreakSource: null,
      updatedAt: 0,
    },
    pomodoros: [],
    taskAlertStates: {},
    courseAvg: { previousAvg: null, numSemesters: 0 },
    holidays: [],
    dismissedNextSemester: {},
    presetUpdatedAt: {},
  }
}

const initialState = buildInitialState()

export const useStore = create((set, get) => ({
  ...initialState,

  // --- Theme ---
  setTheme: theme => set(s => persist({ ...s, theme })),

  // --- Language ---
  setLang: lang => set(s => persist({ ...s, lang })),

  setActiveTab: tab => set(s => ({ ...s, activeTab: tab })),

  wipeAppData: wipeFn => set(s => persist(wipeFn(s))),
  wipeCollabData: () => set(s => persist({
    ...s,
    settings: { ...s.settings, collabEnabled: false, apps: { ...s.settings.apps, collab: false } },
    collab: { userId: null, memberships: [] },
    collabRuntime: { teams: {} },
    tasks: (s.tasks ?? []).map(t => (t.sharedRef || t.sharedMeta) ? { ...t, sharedRef: null, sharedMeta: null } : t),
  })),

  // --- Onboarding ---
  completeOnboarding: () => set(s => persist({ ...s, onboardingDone: true })),

  // --- Semesters ---
  addSemester: data => {
    const id = nanoid()
    set(s => persist({
      ...s,
      activeSemesterId: s.activeSemesterId ?? id,
      semesters: [...s.semesters, { id, ...data }],
      kanban: { ...s.kanban, [id]: { columns: DEFAULT_COLUMNS } },
    }))
    return id
  },
  updateSemester: (id, data) => set(s => persist({
    ...s,
    semesters: s.semesters.map(sem => sem.id === id ? { ...sem, ...data } : sem),
  })),
  deleteSemester: id => set(s => persist({
    ...s,
    activeSemesterId: s.activeSemesterId === id ? (s.semesters.find(x => x.id !== id)?.id ?? null) : s.activeSemesterId,
    semesters: s.semesters.filter(x => x.id !== id),
    classes: s.classes.filter(c => c.semesterId !== id),
    tasks: s.tasks.filter(t => t.semesterId !== id),
    events: (s.events ?? []).filter(e => e.semesterId !== id),
    holidays: (s.holidays ?? []).filter(h => h.semesterId !== id),
    kanban: Object.fromEntries(Object.entries(s.kanban).filter(([k]) => k !== id)),
    grades: Object.fromEntries(Object.entries(s.grades).filter(([k]) => k !== id)),
  })),
  setActiveSemester: id => set(s => persist({ ...s, activeSemesterId: id })),

  // --- Classes ---
  addClass: data => set(s => persist({ ...s, classes: [...s.classes, { id: nanoid(), ects: 6, ...data }] })),
  updateClass: (id, data) => set(s => persist({
    ...s, classes: s.classes.map(c => c.id === id ? { ...c, ...data } : c),
  })),
  deleteClass: id => set(s => persist({
    ...s,
    classes: s.classes.filter(c => c.id !== id),
    tasks: s.tasks.filter(t => t.classId !== id),
  })),

  // --- Tasks ---
  addTask: data => set(s => persist({
    ...s,
    tasks: [...s.tasks, {
      id: nanoid(),
      done: false,
      views: { list: true, kanban: false, calendar: false },
      kanban: null,
      ...data,
    }],
  })),
  toggleTask: id => set(s => persist({
    ...s,
    tasks: s.tasks.map(t => {
      if (t.id !== id) return t
      const done = !t.done
      if (!t.kanban) return { ...t, done }
      const boardId = boardIdForTask(t)
      const targetCol = done ? doneColumnIdFor(s, boardId) : firstColumnIdFor(s, boardId)
      return { ...t, done, kanban: { ...t.kanban, columnId: targetCol ?? t.kanban.columnId } }
    }),
  })),
  updateTask: (id, data) => set(s => persist({
    ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, ...data } : t),
  })),
  dismissTaskAlert: (taskId, date) => set(s => {
    const key = `${taskId}:${date}`
    const prev = s.taskAlertStates ?? {}
    const state = prev[key] ?? {}
    return persist({
      ...s,
      taskAlertStates: {
        ...prev,
        [key]: {
          ...state,
          hidden: true,
          remindAt: state.remindAt ?? null,
        },
      },
    })
  }),
  setTaskAlertReminder: (taskId, date, remindAt) => set(s => {
    const key = `${taskId}:${date}`
    const prev = s.taskAlertStates ?? {}
    return persist({
      ...s,
      taskAlertStates: {
        ...prev,
        [key]: {
          hidden: true,
          remindAt,
        },
      },
    })
  }),
  clearTaskAlertState: (taskId, date) => set(s => {
    const key = `${taskId}:${date}`
    const prev = { ...(s.taskAlertStates ?? {}) }
    delete prev[key]
    return persist({ ...s, taskAlertStates: prev })
  }),
  deleteTask: id => set(s => persist({ ...s, tasks: s.tasks.filter(t => t.id !== id) })),

  // --- Events ---
  addEvent: data => set(s => persist({
    ...s,
    events: [...(s.events ?? []), { id: nanoid(), semesterId: null, allDay: true, color: null, note: '', ...data }],
  })),
  updateEvent: (id, data) => set(s => persist({
    ...s, events: (s.events ?? []).map(e => e.id === id ? { ...e, ...data } : e),
  })),
  deleteEvent: id => set(s => persist({ ...s, events: (s.events ?? []).filter(e => e.id !== id) })),

  // --- Notes ---
  addNote: data => set(s => {
    const now = Date.now()
    const order = (s.notes ?? []).reduce((m, n) => Math.min(m, n.order ?? 0), 0) - 1
    return persist({
      ...s,
      notes: [...(s.notes ?? []), { id: nanoid(), title: '', kind: 'text', body: '', strokes: [], favorite: false, folderId: null, order, createdAt: now, updatedAt: now, ...data }],
    })
  }),
  updateNote: (id, data) => set(s => persist({
    ...s, notes: (s.notes ?? []).map(n => n.id === id ? { ...n, ...data, updatedAt: Date.now() } : n),
  })),
  deleteNote: id => set(s => persist({ ...s, notes: (s.notes ?? []).filter(n => n.id !== id) })),
  toggleFavoriteNote: id => set(s => persist({
    ...s, notes: (s.notes ?? []).map(n => n.id === id ? { ...n, favorite: !n.favorite } : n),
  })),
  moveNoteToFolder: (id, folderId) => set(s => persist({
    ...s, notes: (s.notes ?? []).map(n => n.id === id ? { ...n, folderId, updatedAt: Date.now() } : n),
  })),
  reorderNotes: orderedIds => set(s => {
    const rank = Object.fromEntries(orderedIds.map((id, i) => [id, i]))
    return persist({
      ...s,
      notes: (s.notes ?? []).map(n => n.id in rank ? { ...n, order: rank[n.id] } : n),
    })
  }),
  addNoteFolder: name => set(s => {
    const order = (s.noteFolders ?? []).reduce((m, f) => Math.min(m, f.order ?? 0), 0) - 1
    return persist({
      ...s, noteFolders: [...(s.noteFolders ?? []), { id: nanoid(), name: name || 'Folder', parentId: null, order }],
    })
  }),
  renameNoteFolder: (id, name) => set(s => persist({
    ...s, noteFolders: (s.noteFolders ?? []).map(f => f.id === id ? { ...f, name } : f),
  })),
  moveNoteFolder: (id, parentId) => set(s => {
    if (id === parentId) return s
    return persist({ ...s, noteFolders: (s.noteFolders ?? []).map(f => f.id === id ? { ...f, parentId } : f) })
  }),
  reorderNoteFolders: orderedIds => set(s => {
    const rank = Object.fromEntries(orderedIds.map((id, i) => [id, i]))
    return persist({ ...s, noteFolders: (s.noteFolders ?? []).map(f => f.id in rank ? { ...f, order: rank[f.id] } : f) })
  }),
  deleteNoteFolder: id => set(s => {
    const parentId = (s.noteFolders ?? []).find(f => f.id === id)?.parentId ?? null
    return persist({
      ...s,
      noteFolders: (s.noteFolders ?? []).filter(f => f.id !== id).map(f => f.parentId === id ? { ...f, parentId } : f),
      notes: (s.notes ?? []).map(n => n.folderId === id ? { ...n, folderId: parentId } : n),
    })
  }),

  // --- Kanban (backed by unified tasks) ---
  addKanbanCard: (semId, card) => set(s => {
    const board = s.kanban[semId] ?? { columns: DEFAULT_COLUMNS }
    const semesterId = semId === FREE_BOARD_ID ? null : semId
    const { columnId, order, checklist, sourceTaskId, ...rest } = card
    if (sourceTaskId) {
      return persist({
        ...s,
        tasks: s.tasks.map(t => t.id === sourceTaskId
          ? { ...t, views: { ...t.views, kanban: true }, kanban: { columnId, order, checklist: checklist ?? [] } }
          : t),
        kanban: { ...s.kanban, [semId]: board },
      })
    }
    const newTask = {
      id: nanoid(),
      semesterId,
      done: false,
      priority: null,
      dueDate: null,
      classId: null,
      weekStart: 1,
      weekEnd: 1,
      ...rest,
      views: { list: false, kanban: true, calendar: false },
      kanban: { columnId, order, checklist: checklist ?? [] },
    }
    return persist({ ...s, tasks: [...s.tasks, newTask], kanban: { ...s.kanban, [semId]: board } })
  }),
  updateKanbanCard: (semId, cardId, data) => set(s => {
    const { columnId, order, checklist, checklistPreview, ...taskFields } = data
    const kanbanPatch = {}
    if (columnId !== undefined) kanbanPatch.columnId = columnId
    if (order !== undefined) kanbanPatch.order = order
    if (checklist !== undefined) kanbanPatch.checklist = checklist
    if (checklistPreview !== undefined) kanbanPatch.checklistPreview = checklistPreview
    return persist({
      ...s,
      tasks: s.tasks.map(t => t.id === cardId
        ? { ...t, ...taskFields, kanban: { ...t.kanban, ...kanbanPatch } }
        : t),
    })
  }),
  moveKanbanCard: (semId, cardId, targetColId) => set(s => {
    const doneCol = doneColumnIdFor(s, semId)
    return persist({
      ...s,
      tasks: s.tasks.map(t => {
        if (t.id !== cardId) return t
        const done = doneCol == null ? t.done : targetColId === doneCol
        return { ...t, done, kanban: { ...t.kanban, columnId: targetColId } }
      }),
    })
  }),
  deleteKanbanCard: (semId, cardId) => set(s => persist({
    ...s,
    tasks: s.tasks.reduce((acc, t) => {
      if (t.id !== cardId) { acc.push(t); return acc }
      if (t.views?.list) acc.push({ ...t, views: { ...t.views, kanban: false } })
      return acc
    }, []),
  })),
  clearKanbanCardSharedRef: (sharedCardId) => set(s => persist({
    ...s,
    tasks: s.tasks.map(t => t?.sharedRef?.sharedCardId === sharedCardId ? { ...t, sharedRef: null } : t),
  })),
  clearKanbanDone: semId => set(s => {
    const board = s.kanban[semId]
    const sorted = [...(board?.columns ?? [])].sort((a, b) => a.order - b.order)
    const doneColId = sorted[sorted.length - 1]?.id
    return persist({
      ...s,
      tasks: s.tasks.reduce((acc, t) => {
        const onBoard = boardIdForTask(t) === semId && t.views?.kanban && t.kanban?.columnId === doneColId
        if (!onBoard) { acc.push(t); return acc }
        if (t.views?.list) acc.push({ ...t, views: { ...t.views, kanban: false } })
        return acc
      }, []),
    })
  }),
  wipeKanban: semId => set(s => ({
    ...persist({
      ...s,
      tasks: s.tasks.reduce((acc, t) => {
        const onBoard = boardIdForTask(t) === semId && t.views?.kanban
        if (!onBoard) { acc.push(t); return acc }
        if (t.views?.list) acc.push({ ...t, views: { ...t.views, kanban: false } })
        return acc
      }, []),
    }),
  })),
  ensureKanbanBoard: semId => set(s => {
    if (s.kanban[semId]?.columns?.length) return s
    return persist({ ...s, kanban: { ...s.kanban, [semId]: { columns: DEFAULT_COLUMNS } } })
  }),
  addKanbanColumn: (semId, title) => set(s => {
    const board = s.kanban[semId] ?? { columns: DEFAULT_COLUMNS }
    const order = board.columns.length
    return persist({ ...s, kanban: { ...s.kanban, [semId]: { ...board, columns: [...board.columns, { id: nanoid(), title, order }] } } })
  }),
  updateKanbanColumn: (semId, colId, title) => set(s => {
    const board = s.kanban[semId]
    return persist({ ...s, kanban: { ...s.kanban, [semId]: { ...board, columns: board.columns.map(c => c.id === colId ? { ...c, title } : c) } } })
  }),
  reorderKanbanColumns: (semId, orderedIds) => set(s => {
    const board = s.kanban[semId]
    if (!board) return s
    const rank = Object.fromEntries(orderedIds.map((id, i) => [id, i]))
    return persist({ ...s, kanban: { ...s.kanban, [semId]: { ...board, columns: board.columns.map(c => ({ ...c, order: rank[c.id] ?? c.order })) } } })
  }),
  deleteKanbanColumn: (semId, colId) => set(s => {
    const board = s.kanban[semId]
    return persist({
      ...s,
      kanban: { ...s.kanban, [semId]: { ...board, columns: board.columns.filter(c => c.id !== colId) } },
      tasks: s.tasks.reduce((acc, t) => {
        const inColumn = boardIdForTask(t) === semId && t.views?.kanban && t.kanban?.columnId === colId
        if (!inColumn) { acc.push(t); return acc }
        if (t.views?.list) acc.push({ ...t, views: { ...t.views, kanban: false } })
        return acc
      }, []),
    })
  }),

  // --- Grades ---
  setGradeComponents: (semId, classId, components) => set(s => {
    const semGrades = s.grades[semId] ?? {}
    const classGrades = semGrades[classId] ?? { components: [], targetGrade: 9.5 }
    return persist({ ...s, grades: { ...s.grades, [semId]: { ...semGrades, [classId]: { ...classGrades, components } } } })
  }),
  setTargetGrade: (semId, classId, targetGrade) => set(s => {
    const semGrades = s.grades[semId] ?? {}
    const classGrades = semGrades[classId] ?? { components: [], targetGrade: 9.5 }
    return persist({ ...s, grades: { ...s.grades, [semId]: { ...semGrades, [classId]: { ...classGrades, targetGrade } } } })
  }),

  // --- Holidays ---
  addHoliday: (semesterId, data) => set(s => persist({ ...s, holidays: [...(s.holidays ?? []), { id: nanoid(), semesterId, ...data }] })),
  deleteHoliday: id => set(s => persist({ ...s, holidays: (s.holidays ?? []).filter(h => h.id !== id) })),

  // --- Settings ---
  updateSettings: data => set(s => persist({ ...s, settings: { ...s.settings, ...data } })),
  setSemesterMode: modeArg => set(s => {
    const mode = modeArg === 'none' ? 'none' : 'semesters'
    if ((s.settings?.semesterMode ?? 'semesters') === mode) return s
    const semester = mode === 'none'
      ? null
      : (s.semesters.find(x => x.id === s.activeSemesterId) ?? null)
    const ctx = getWeekContext({ mode, semester })
    return persist({
      ...s,
      settings: { ...s.settings, semesterMode: mode },
      tasks: remapTaskWeeks(s.tasks, ctx),
    })
  }),
  updateFocusSettings: data => set(s => persist({
    ...s, settings: { ...s.settings, focus: { ...s.settings.focus, ...data } }
  })),
  updatePomodoroSettings: data => set(s => persist({
    ...s, settings: { ...s.settings, pomodoro: { ...s.settings.pomodoro, ...data } }
  })),
  setCollabUserId: userId => set(s => persist({
    ...s,
    collab: {
      ...(s.collab ?? { userId: null, memberships: [] }),
      userId,
    },
  })),
  addCollabMembership: membership => set(s => {
    const collab = s.collab ?? { userId: null, memberships: [] }
    const existing = (collab.memberships ?? []).find(m => m.teamId === membership.teamId)
    const memberships = existing
      ? collab.memberships.map(m => m.teamId === membership.teamId ? { ...m, ...membership } : m)
      : [...(collab.memberships ?? []), membership]
    return persist({ ...s, collab: { ...collab, memberships } })
  }),
  updateCollabMembership: (teamId, data) => set(s => {
    const collab = s.collab ?? { userId: null, memberships: [] }
    const memberships = (collab.memberships ?? []).map(m => m.teamId === teamId ? { ...m, ...data } : m)
    return persist({ ...s, collab: { ...collab, memberships } })
  }),
  removeCollabMembership: teamId => set(s => {
    const collab = s.collab ?? { userId: null, memberships: [] }
    const memberships = (collab.memberships ?? []).filter(m => m.teamId !== teamId)
    const teams = { ...(s.collabRuntime?.teams ?? {}) }
    delete teams[teamId]
    return persist({
      ...s,
      collab: { ...collab, memberships },
      collabRuntime: { ...(s.collabRuntime ?? { teams: {} }), teams },
    })
  }),
  setCollabRuntimeTeam: (teamId, teamData) => set(s => ({
    ...s,
    collabRuntime: {
      ...(s.collabRuntime ?? { teams: {} }),
      teams: {
        ...(s.collabRuntime?.teams ?? {}),
        [teamId]: teamData,
      },
    },
  })),
  setCollabError: (teamId, message) => set(s => ({
    ...s,
    collabRuntime: {
      ...(s.collabRuntime ?? { teams: {} }),
      lastError: message ? { teamId, message, at: Date.now() } : null,
    },
  })),
  clearCollabError: () => set(s => ({
    ...s,
    collabRuntime: { ...(s.collabRuntime ?? { teams: {} }), lastError: null },
  })),
  clearCollabRuntimeTeam: teamId => set(s => {
    const teams = { ...(s.collabRuntime?.teams ?? {}) }
    delete teams[teamId]
    return {
      ...s,
      collabRuntime: {
        ...(s.collabRuntime ?? { teams: {} }),
        teams,
      },
    }
  }),
  clearTaskSharedRefByTeam: teamId => set(s => persist({
    ...s,
    tasks: s.tasks.map(task => task?.sharedRef?.teamId === teamId
      ? { ...task, sharedRef: null }
      : task),
  })),
  deleteLocalSharedTasksByTeam: teamId => set(s => persist({
    ...s,
    tasks: s.tasks.filter(task => task?.sharedRef?.teamId !== teamId),
  })),
  setFocusSync: data => set(s => persist({
    ...s,
    focusSync: {
      ...(s.focusSync ?? {
        status: 'paused',
        phase: 'focus',
        startedAt: null,
        totalElapsedBase: 0,
        cycleElapsedBase: 0,
        breakSecsLeftBase: 0,
        activeBreakSource: null,
        updatedAt: 0,
      }),
      ...data,
      updatedAt: Date.now(),
    },
  })),
  addPomodoro: (pomodoro) => set(s => persist({ ...s, pomodoros: [...(s.pomodoros ?? []), pomodoro] })),
  clearPomodoros: () => set(s => persist({ ...s, pomodoros: [] })),
  erasePomodoroStats: () => set(s => persist({
    ...s,
    pomodoros: (s.pomodoros ?? []).map(p => {
      const { focusSecs, createdAt, ...rest } = p
      return rest
    }),
  })),
  dismissNextSemester: semId => set(s => persist({
    ...s, dismissedNextSemester: { ...(s.dismissedNextSemester ?? {}), [semId]: true }
  })),
  setPresetUpdatedAt: (key, updatedAt) => set(s => persist({
    ...s, presetUpdatedAt: { ...(s.presetUpdatedAt ?? {}), [key]: updatedAt }
  })),

  // --- Import / Export ---
  importData: data => set(s => {
    const { state, status } = migrateState(data)
    if (status === 'invalid' || status === 'newer') return s
    return persist(normalizeState({ ...state }))
  }),

  // --- Previous Semesters ---
  setSemesterFinalGrade: (semId, grade) => set(s => {
    const semGrades = s.grades[semId] ?? {}
    return persist({ ...s, grades: { ...s.grades, [semId]: { ...semGrades, _semesterFinalGrade: grade } } })
  }),
  setCourseAvg: courseAvg => set(s => persist({ ...s, courseAvg })),
}))

function persist(state) {
  saveState(state)
  return state
}
