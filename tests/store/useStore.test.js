import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetStateDb } from '../helpers/testStorage.js'
import { useStore } from '../../src/store/useStore.js'
import { EISENHOWER_DISMISSED, FREE_BOARD_ID } from '../../src/lib/taskUtils.js'

function resetStore() {
  useStore.setState({
    tasks: [],
    events: [],
    notes: [],
    noteFolders: [],
    sharedNoteFolders: {},
    habits: [],
    classes: [],
    semesters: [],
    activeSemesterId: null,
    kanban: {},
    grades: {},
    holidays: [],
    pomodoros: [],
    courseAvg: { previousAvg: null, numSemesters: 0 },
    dismissedNextSemester: {},
    presetUpdatedAt: {},
    taskAlertStates: {},
    hydrated: true,
  })
}

beforeEach(async () => {
  vi.resetModules()
  await resetStateDb()
  resetStore()
})

describe('useStore - Tasks & Eisenhower Actions', () => {
  it('adds, updates, and deletes tasks', () => {
    useStore.getState().addTask({ title: 'Finish homework', semesterId: 'sem1' })
    const tasks = useStore.getState().tasks
    expect(tasks).toHaveLength(1)
    expect(tasks[0].title).toBe('Finish homework')
    expect(tasks[0].done).toBe(false)

    const taskId = tasks[0].id
    useStore.getState().updateTask(taskId, { title: 'Finish math homework', priority: 'high' })
    expect(useStore.getState().tasks[0].title).toBe('Finish math homework')
    expect(useStore.getState().tasks[0].priority).toBe('high')

    useStore.getState().deleteTask(taskId)
    expect(useStore.getState().tasks).toHaveLength(0)
  })

  it('toggles task done status and sets task done directly', () => {
    useStore.getState().addTask({ title: 'Read chapter' })
    const taskId = useStore.getState().tasks[0].id

    useStore.getState().toggleTask(taskId)
    expect(useStore.getState().tasks[0].done).toBe(true)

    useStore.getState().toggleTask(taskId)
    expect(useStore.getState().tasks[0].done).toBe(false)

    useStore.getState().setTaskDone(taskId, true)
    expect(useStore.getState().tasks[0].done).toBe(true)

    useStore.getState().setTaskDone(taskId, true) // no-op when already true
    expect(useStore.getState().tasks[0].done).toBe(true)
  })

  it('handles eisenhower quadrant assignment and clearing completed items', () => {
    useStore.getState().addTask({ title: 'Urgent task' })
    const taskId = useStore.getState().tasks[0].id

    useStore.getState().setTaskEisenhower(taskId, 'q1')
    expect(useStore.getState().tasks[0].eisenhower).toBe('q1')

    useStore.getState().setTaskDone(taskId, true)
    useStore.getState().clearEisenhowerDone()
    expect(useStore.getState().tasks[0].eisenhower).toBe(EISENHOWER_DISMISSED)
  })

  it('manages recurring task occurrence exceptions', () => {
    useStore.getState().addTask({ title: 'Daily workout', recurrence: { freq: 'daily' } })
    const taskId = useStore.getState().tasks[0].id

    useStore.getState().toggleRecurringOccurrence(taskId, '2026-09-19')
    expect(useStore.getState().tasks[0].recurrenceExceptions['2026-09-19']?.done).toBe(true)

    useStore.getState().toggleRecurringOccurrence(taskId, '2026-09-19')
    expect(useStore.getState().tasks[0].recurrenceExceptions['2026-09-19']?.done).toBe(false)
  })

  it('manages task alert states (dismiss, reminder, clear)', () => {
    useStore.getState().dismissTaskAlert('task1', '2026-09-19')
    expect(useStore.getState().taskAlertStates['task1:2026-09-19']?.hidden).toBe(true)

    useStore.getState().setTaskAlertReminder('task1', '2026-09-19', 123456789)
    expect(useStore.getState().taskAlertStates['task1:2026-09-19']?.remindAt).toBe(123456789)

    useStore.getState().clearTaskAlertState('task1', '2026-09-19')
    expect(useStore.getState().taskAlertStates['task1:2026-09-19']).toBeUndefined()
  })
})

describe('useStore - Notes & Note Folders', () => {
  it('adds, updates, favorites, archives, unarchives and deletes notes', () => {
    useStore.getState().addNote({ title: 'My Note', body: 'Hello world' })
    const notes = useStore.getState().notes
    expect(notes).toHaveLength(1)
    expect(notes[0].title).toBe('My Note')
    expect(notes[0].favorite).toBe(false)

    const noteId = notes[0].id
    useStore.getState().updateNote(noteId, { title: 'Updated Note' })
    expect(useStore.getState().notes[0].title).toBe('Updated Note')

    useStore.getState().toggleFavoriteNote(noteId)
    expect(useStore.getState().notes[0].favorite).toBe(true)

    useStore.getState().toggleOfflineOnlyNote(noteId)
    expect(useStore.getState().notes[0].offlineOnly).toBe(true)

    useStore.getState().archiveNote(noteId)
    expect(useStore.getState().notes[0].archived).toBe(true)

    useStore.getState().unarchiveNote(noteId)
    expect(useStore.getState().notes[0].archived).toBe(false)

    useStore.getState().deleteNote(noteId)
    expect(useStore.getState().notes).toHaveLength(0)
  })

  it('moves notes to folder and reorders notes', () => {
    useStore.getState().addNote({ title: 'N1' })
    useStore.getState().addNote({ title: 'N2' })
    const [n1, n2] = useStore.getState().notes

    useStore.getState().moveNoteToFolder(n1.id, 'folder_1')
    expect(useStore.getState().notes.find(n => n.id === n1.id)?.folderId).toBe('folder_1')

    useStore.getState().moveNoteToFolder('shared:team1:note99', 'folder_1')
    expect(useStore.getState().sharedNoteFolders['shared:team1:note99']).toBe('folder_1')

    useStore.getState().reorderNotes([n2.id, n1.id])
    const reordered = useStore.getState().notes
    expect(reordered.find(n => n.id === n2.id)?.order).toBe(0)
    expect(reordered.find(n => n.id === n1.id)?.order).toBe(1)
  })

  it('creates, renames, moves, and deletes note folders with nesting cycle guard', () => {
    useStore.getState().addNoteFolder('Math')
    const folderA = useStore.getState().noteFolders[0]
    expect(folderA.name).toBe('Math')

    useStore.getState().addNoteFolder('Calculus', folderA.id)
    const folderB = useStore.getState().noteFolders[1]
    expect(folderB.parentId).toBe(folderA.id)

    useStore.getState().renameNoteFolder(folderB.id, 'Calc I')
    expect(useStore.getState().noteFolders.find(f => f.id === folderB.id)?.name).toBe('Calc I')

    // Cycle check: moving A inside B (its child) should be rejected
    useStore.getState().moveNoteFolder(folderA.id, folderB.id)
    expect(useStore.getState().noteFolders.find(f => f.id === folderA.id)?.parentId).toBeNull()

    // Self parent check
    useStore.getState().moveNoteFolder(folderA.id, folderA.id)
    expect(useStore.getState().noteFolders.find(f => f.id === folderA.id)?.parentId).toBeNull()

    // Add a note into folder B and delete folder B
    useStore.getState().addNote({ title: 'Integral', folderId: folderB.id })
    useStore.getState().deleteNoteFolder(folderB.id)
    expect(useStore.getState().noteFolders.find(f => f.id === folderB.id)).toBeUndefined()
    // Note should have moved up to folderA
    expect(useStore.getState().notes[0].folderId).toBe(folderA.id)
  })

  it('openNoteForEvent finds existing or creates new linked note', () => {
    const key = 'event_series_1:2026-09-19'
    const noteId1 = useStore.getState().openNoteForEvent({
      key,
      title: 'Physics Lecture',
      seriesKey: 'physics_series',
      seriesName: 'Physics',
    })
    expect(noteId1).toBeDefined()
    expect(useStore.getState().notes).toHaveLength(1)
    expect(useStore.getState().notes[0].linkedEventKey).toBe(key)
    expect(useStore.getState().noteFolders).toHaveLength(1)
    expect(useStore.getState().noteFolders[0].name).toBe('Physics')

    // Calling again returns the same note id
    const noteId2 = useStore.getState().openNoteForEvent({ key, title: 'Physics Lecture' })
    expect(noteId2).toBe(noteId1)
    expect(useStore.getState().notes).toHaveLength(1)
  })
})

describe('useStore - Semesters & Classes', () => {
  it('manages semesters and cascades deletion', () => {
    const semId = useStore.getState().addSemester({ name: 'Fall 2026' })
    expect(useStore.getState().semesters).toHaveLength(1)
    expect(useStore.getState().activeSemesterId).toBe(semId)

    useStore.getState().updateSemester(semId, { name: 'Fall 2026 Rev' })
    expect(useStore.getState().semesters[0].name).toBe('Fall 2026 Rev')

    useStore.getState().addClass({ name: 'Linear Algebra', semesterId: semId })
    useStore.getState().addTask({ title: 'Assignment 1', semesterId: semId })
    useStore.getState().addEvent({ title: 'Midterm', semesterId: semId })
    useStore.getState().addHoliday(semId, { name: 'Thanksgiving', date: '2026-11-26' })

    useStore.getState().deleteSemester(semId)
    expect(useStore.getState().semesters).toHaveLength(0)
    expect(useStore.getState().classes).toHaveLength(0)
    expect(useStore.getState().tasks).toHaveLength(0)
    expect(useStore.getState().events).toHaveLength(0)
    expect(useStore.getState().holidays).toHaveLength(0)
  })

  it('manages classes and cascades task cleanup', () => {
    useStore.getState().addClass({ name: 'CS 101' })
    const classId = useStore.getState().classes[0].id
    expect(useStore.getState().classes[0].ects).toBe(6)

    useStore.getState().updateClass(classId, { name: 'CS 101 Intro', ects: 8 })
    expect(useStore.getState().classes[0].name).toBe('CS 101 Intro')
    expect(useStore.getState().classes[0].ects).toBe(8)

    useStore.getState().addTask({ title: 'Lab 1', classId })
    useStore.getState().addTask({ title: 'Unrelated task' })
    expect(useStore.getState().tasks).toHaveLength(2)

    useStore.getState().deleteClass(classId)
    expect(useStore.getState().classes).toHaveLength(0)
    expect(useStore.getState().tasks).toHaveLength(1)
    expect(useStore.getState().tasks[0].title).toBe('Unrelated task')
  })

  it('handles advanceCourseAvg', () => {
    useStore.getState().advanceCourseAvg(16.0, true)
    expect(useStore.getState().courseAvg.numSemesters).toBe(1)
    expect(useStore.getState().courseAvg.previousAvg).toBe(16.0)

    useStore.getState().advanceCourseAvg(18.0, false) // ignored when countsTowardAvg is false
    expect(useStore.getState().courseAvg.numSemesters).toBe(1)
    expect(useStore.getState().courseAvg.previousAvg).toBe(16.0)
  })
})

describe('useStore - Kanban Boards & Columns', () => {
  it('ensures board, adds columns, updates, reorders, and deletes columns', () => {
    useStore.getState().ensureKanbanBoard(FREE_BOARD_ID)
    const board = useStore.getState().kanban[FREE_BOARD_ID]
    expect(board.columns).toHaveLength(3)

    useStore.getState().addKanbanColumn(FREE_BOARD_ID, 'Review')
    expect(useStore.getState().kanban[FREE_BOARD_ID].columns).toHaveLength(4)
    const newColId = useStore.getState().kanban[FREE_BOARD_ID].columns[3].id

    useStore.getState().updateKanbanColumn(FREE_BOARD_ID, newColId, 'In Review')
    expect(useStore.getState().kanban[FREE_BOARD_ID].columns[3].title).toBe('In Review')

    const cols = useStore.getState().kanban[FREE_BOARD_ID].columns
    useStore.getState().reorderKanbanColumns(FREE_BOARD_ID, [cols[1].id, cols[0].id, cols[2].id, cols[3].id])
    expect(useStore.getState().kanban[FREE_BOARD_ID].columns[1].order).toBe(0)

    useStore.getState().deleteKanbanColumn(FREE_BOARD_ID, newColId)
    expect(useStore.getState().kanban[FREE_BOARD_ID].columns).toHaveLength(3)
  })

  it('wipes kanban cards without deleting tasks from list view', () => {
    useStore.getState().addTask({
      title: 'Kanban & List task',
      views: { list: true, kanban: true },
      kanban: { columnId: 'col_todo', order: 0 },
    })
    const taskId = useStore.getState().tasks[0].id

    useStore.getState().wipeKanban(FREE_BOARD_ID)
    const task = useStore.getState().tasks.find(t => t.id === taskId)
    expect(task.views.kanban).toBe(false)
    expect(task.views.list).toBe(true)
  })
})

describe('useStore - Grades & Holidays', () => {
  it('sets grade components and target grades', () => {
    useStore.getState().setGradeComponents('sem1', 'class1', [
      { id: 'c1', name: 'Exam', weight: 0.6, grade: 15 },
    ])
    expect(useStore.getState().grades['sem1']?.['class1']?.components).toHaveLength(1)

    useStore.getState().setTargetGrade('sem1', 'class1', 14)
    expect(useStore.getState().grades['sem1']?.['class1']?.targetGrade).toBe(14)

    useStore.getState().setSemesterFinalGrade('sem1', 15.5)
    expect(useStore.getState().grades['sem1']?._semesterFinalGrade).toBe(15.5)
  })

  it('manages holidays', () => {
    useStore.getState().addHoliday('sem1', { name: 'Spring Break', date: '2026-03-20' })
    expect(useStore.getState().holidays).toHaveLength(1)
    const id = useStore.getState().holidays[0].id

    useStore.getState().deleteHoliday(id)
    expect(useStore.getState().holidays).toHaveLength(0)
  })
})

describe('useStore - Habits & Pomodoro', () => {
  it('adds, updates, checks in, and undos check-ins for habits', () => {
    useStore.getState().addHabit({ title: 'Drink Water' })
    const habitId = useStore.getState().habits[0].id

    useStore.getState().updateHabit(habitId, { title: 'Hydration 2L' })
    expect(useStore.getState().habits[0].title).toBe('Hydration 2L')

    useStore.getState().checkInHabit(habitId, '2026-09-19', 'Good job')
    expect(useStore.getState().habits[0].checkIns['2026-09-19']?.note).toBe('Good job')

    useStore.getState().undoHabitCheckIn(habitId, '2026-09-19')
    expect(useStore.getState().habits[0].checkIns['2026-09-19']).toBeUndefined()

    useStore.getState().deleteHabit(habitId)
    expect(useStore.getState().habits).toHaveLength(0)
  })

  it('manages pomodoros and clears statistics', () => {
    useStore.getState().addPomodoro({ id: 'p1', focusSecs: 1500, createdAt: Date.now() })
    expect(useStore.getState().pomodoros).toHaveLength(1)

    useStore.getState().erasePomodoroStats()
    expect(useStore.getState().pomodoros[0].focusSecs).toBeUndefined()

    useStore.getState().clearPomodoros()
    expect(useStore.getState().pomodoros).toHaveLength(0)
  })
})
