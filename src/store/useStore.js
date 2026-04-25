import { create } from 'zustand'
import { nanoid } from '@/lib/ids'
import { loadState, saveState } from './persist'

const DEFAULT_COLUMNS = [
  { id: 'col_todo', title: 'To Do', order: 0 },
  { id: 'col_inprogress', title: 'In Progress', order: 1 },
  { id: 'col_done', title: 'Done', order: 2 },
]

function buildInitialState() {
  const saved = loadState()
  if (saved) return saved
  return {
    version: 1,
    theme: 'system',
    lang: 'pt',
    onboardingDone: false,
    activeSemesterId: null,
    semesters: [],
    classes: [],
    tasks: [],
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
  }
}

const initialState = buildInitialState()

export const useStore = create((set, get) => ({
  ...initialState,

  // --- Theme ---
  setTheme: theme => set(s => persist({ ...s, theme })),

  // --- Language ---
  setLang: lang => set(s => persist({ ...s, lang })),

  // --- Onboarding ---
  completeOnboarding: () => set(s => persist({ ...s, onboardingDone: true })),

  // --- Semesters ---
  addSemester: data => {
    const id = nanoid()
    set(s => persist({
      ...s,
      activeSemesterId: s.activeSemesterId ?? id,
      semesters: [...s.semesters, { id, ...data }],
      kanban: { ...s.kanban, [id]: { columns: DEFAULT_COLUMNS, cards: [] } },
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
  addTask: data => set(s => persist({ ...s, tasks: [...s.tasks, { id: nanoid(), done: false, ...data }] })),
  toggleTask: id => set(s => persist({
    ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t),
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

  // --- Kanban ---
  addKanbanCard: (semId, card) => set(s => {
    const board = s.kanban[semId] ?? { columns: DEFAULT_COLUMNS, cards: [] }
    return persist({ ...s, kanban: { ...s.kanban, [semId]: { ...board, cards: [...board.cards, { id: nanoid(), checklist: [], ...card }] } } })
  }),
  updateKanbanCard: (semId, cardId, data) => set(s => {
    const board = s.kanban[semId]
    return persist({ ...s, kanban: { ...s.kanban, [semId]: { ...board, cards: board.cards.map(c => c.id === cardId ? { ...c, ...data } : c) } } })
  }),
  moveKanbanCard: (semId, cardId, targetColId) => set(s => {
    const board = s.kanban[semId]
    return persist({ ...s, kanban: { ...s.kanban, [semId]: { ...board, cards: board.cards.map(c => c.id === cardId ? { ...c, columnId: targetColId } : c) } } })
  }),
  deleteKanbanCard: (semId, cardId) => set(s => {
    const board = s.kanban[semId]
    return persist({ ...s, kanban: { ...s.kanban, [semId]: { ...board, cards: board.cards.filter(c => c.id !== cardId) } } })
  }),
  clearKanbanCardSharedRef: (sharedCardId) => set(s => {
    const kanban = Object.fromEntries(
      Object.entries(s.kanban ?? {}).map(([boardId, board]) => [
        boardId,
        { ...board, cards: (board.cards ?? []).map(c => c?.sharedRef?.sharedCardId === sharedCardId ? { ...c, sharedRef: null } : c) },
      ])
    )
    return persist({ ...s, kanban })
  }),
  clearKanbanDone: semId => set(s => {
    const board = s.kanban[semId]
    const sorted = [...board.columns].sort((a, b) => a.order - b.order)
    const doneColId = sorted[sorted.length - 1]?.id
    return persist({ ...s, kanban: { ...s.kanban, [semId]: { ...board, cards: board.cards.filter(c => c.columnId !== doneColId) } } })
  }),
  wipeKanban: semId => set(s => {
    const board = s.kanban[semId]
    return persist({ ...s, kanban: { ...s.kanban, [semId]: { ...board, cards: [] } } })
  }),
  addKanbanColumn: (semId, title) => set(s => {
    const board = s.kanban[semId] ?? { columns: DEFAULT_COLUMNS, cards: [] }
    const order = board.columns.length
    return persist({ ...s, kanban: { ...s.kanban, [semId]: { ...board, columns: [...board.columns, { id: nanoid(), title, order }] } } })
  }),
  updateKanbanColumn: (semId, colId, title) => set(s => {
    const board = s.kanban[semId]
    return persist({ ...s, kanban: { ...s.kanban, [semId]: { ...board, columns: board.columns.map(c => c.id === colId ? { ...c, title } : c) } } })
  }),
  deleteKanbanColumn: (semId, colId) => set(s => {
    const board = s.kanban[semId]
    return persist({ ...s, kanban: { ...s.kanban, [semId]: { ...board, columns: board.columns.filter(c => c.id !== colId), cards: board.cards.filter(c => c.columnId !== colId) } } })
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
  deleteLocalSharedTasksByTeam: teamId => set(s => {
    const removedTaskIds = new Set(
      s.tasks
        .filter(task => task?.sharedRef?.teamId === teamId)
        .map(task => task.id)
    )

    const tasks = s.tasks.filter(task => task?.sharedRef?.teamId !== teamId)
    const kanban = Object.fromEntries(
      Object.entries(s.kanban ?? {}).map(([boardId, board]) => [
        boardId,
        {
          ...board,
          cards: (board?.cards ?? []).filter(card => !removedTaskIds.has(card?.sourceTaskId)),
        },
      ])
    )

    return persist({
      ...s,
      tasks,
      kanban,
    })
  }),
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

  // --- Import / Export ---
  importData: data => set(() => persist({ ...data })),

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
