import { parseISO, isValid } from 'date-fns'
import { fetchPresetFromFirebase, fetchPresetMetaFromFirebase } from './presetsFirebase'
import { nanoid } from '@/lib/ids'
import { selectSemesterGPA } from '@/store/selectors'

const NEXT_KEY_MAP = {
  '1a1s': '1a2s',
  '1a2s': 'summer',
  '2a1s': '2a2s',
  '2a2s': 'summer',
  '3a1s': '3a2s',
  '3a2s': 'summer',
  's1':   's2',
  's2':   'summer',
}

const AFTER_SUMMER_MAP = {
  '1a2s': '2a1s',
  '2a2s': '3a1s',
  '3a2s': 's1',
  's2':   's1',
}

export const PRESET_GROUPS = {
  EI: ['1a1s', '1a2s', '2a1s', '2a2s', '3a1s', '3a2s'],
  generic: ['s1', 's2'],
}

export function getNextPresetKey(currentKey, previousKey) {
  if (currentKey === 'summer') return AFTER_SUMMER_MAP[previousKey] ?? 's1'
  return NEXT_KEY_MAP[currentKey] ?? null
}

export function countsTowardCourseAvg(presetKey) {
  return presetKey !== 'summer'
}

// EI presets carry classes/tasks/grades but no calendar dates — those live on the
// matching generic preset (`s1` for a 1st semester, `s2` for a 2nd).
export function dateSourceKey(key) {
  const match = /^\da([12])s$/.exec(key)
  return match ? `s${match[1]}` : null
}

async function fetchPresetDates(key, setPresetUpdatedAt) {
  const sourceKey = dateSourceKey(key)
  if (!sourceKey) return null
  const source = await fetchPresetFromFirebase(sourceKey)
  if (!source?.data?.startDate || !source?.data?.endDate) return null
  setPresetUpdatedAt?.(sourceKey, source.updatedAt)
  return { startDate: source.data.startDate, endDate: source.data.endDate }
}

export async function fetchPreset(key, setPresetUpdatedAt) {
  const remote = await fetchPresetFromFirebase(key)
  if (!remote?.data) throw new Error(`preset-${key} not found`)
  setPresetUpdatedAt?.(key, remote.updatedAt)

  const data = { ...remote.data }
  if (!data.startDate || !data.endDate) {
    const dates = await fetchPresetDates(key, setPresetUpdatedAt)
    if (dates) Object.assign(data, dates)
  }
  return data
}

export async function checkPresetExists(key) {
  const meta = await fetchPresetMetaFromFirebase(key)
  return !!meta
}

// Firestore may hand back a Timestamp instead of an ISO string.
function toDateString(value) {
  if (typeof value === 'string') return value.trim()
  const date = typeof value?.toDate === 'function' ? value.toDate() : value
  return date instanceof Date && isValid(date) ? date.toISOString().slice(0, 10) : undefined
}

function assertPresetDates(data, presetKey) {
  const start = toDateString(data.startDate)
  const end = toDateString(data.endDate)
  if (!start || !end) throw new Error(`preset-${presetKey} missing dates`)

  const parsedStart = parseISO(start)
  const parsedEnd = parseISO(end)
  if (!isValid(parsedStart) || !isValid(parsedEnd)) {
    throw new Error(`preset-${presetKey} invalid dates`)
  }
  if (parsedStart > parsedEnd) throw new Error(`preset-${presetKey} end before start`)

  return { start, end }
}

export function applyPreset(data, actions, presetKey, previousPresetKey) {
  const { addSemester } = actions

  const { start, end } = assertPresetDates(data, presetKey)

  const semData = {
    name: data.name ?? presetKey,
    startDate: start,
    endDate: end,
    presetKey,
  }
  if (presetKey === 'summer' && previousPresetKey) semData.previousPresetKey = previousPresetKey
  const semId = addSemester(semData)

  _populateSemester(semId, data, actions)

  return semId
}

export async function transitionSemester(oldSemId, nextKey, carry, actions) {
  const { getState, setPresetUpdatedAt, reassignSemesterData, advanceCourseAvg, deleteSemester, setActiveSemester } = actions

  const data = await fetchPreset(nextKey, setPresetUpdatedAt)

  const stateBefore = getState()
  const oldSem = stateBefore.semesters.find(s => s.id === oldSemId)
  const oldGPA = selectSemesterGPA(oldSemId, stateBefore)

  const { start } = assertPresetDates(data, nextKey)

  const previousPresetKey = nextKey === 'summer' ? (oldSem?.presetKey ?? null) : null
  const newSemId = applyPreset(data, actions, nextKey, previousPresetKey)

  try {
    reassignSemesterData(oldSemId, newSemId, carry, start)
    advanceCourseAvg(oldGPA, countsTowardCourseAvg(oldSem?.presetKey))
    deleteSemester(oldSemId)
    setActiveSemester(newSemId)
  } catch (err) {
    deleteSemester(newSemId)
    setActiveSemester(oldSemId)
    throw err
  }

  return newSemId
}

export function updatePreset(semId, data, actions) {
  const { addClass, addHoliday, setGradeComponents, setTargetGrade, addTask, updateSemester, getClasses, getState } = actions

  if (data.startDate || data.endDate) {
    const sem = getState().semesters.find(s => s.id === semId)
    updateSemester(semId, {
      startDate: data.startDate || sem?.startDate,
      endDate: data.endDate || sem?.endDate,
    })
  }

  const existingClasses = getClasses().filter(c => c.semesterId === semId)
  const existingClassNames = new Set(existingClasses.map(c => c.name))
  ;(data.classes ?? []).forEach(cls => {
    if (!existingClassNames.has(cls.name)) {
      addClass({ semesterId: semId, name: cls.name, ects: cls.ects ?? 6, color: cls.color })
    }
  })

  const allClasses = getClasses().filter(c => c.semesterId === semId)
  const classIdByName = Object.fromEntries(allClasses.map(c => [c.name, c.id]))

  const existingHolidays = (getState().holidays ?? []).filter(h => h.semesterId === semId)
  const existingHolidayNames = new Set(existingHolidays.map(h => h.name))
  ;(data.holidays ?? []).forEach(h => {
    if (!existingHolidayNames.has(h.name)) {
      addHoliday(semId, { name: h.name, startDate: h.startDate, endDate: h.endDate })
    }
  })

  const existingTasks = (getState().tasks ?? []).filter(t => t.semesterId === semId)
  const existingTaskKeys = new Set(existingTasks.map(t => `${t.title}|${t.weekStart}`))
  ;(data.tasks ?? []).forEach(task => {
    const key = `${task.title}|${task.weekStart}`
    if (!existingTaskKeys.has(key)) {
      addTask({
        semesterId: semId,
        classId: task.className ? (classIdByName[task.className] ?? null) : null,
        title: task.title,
        priority: task.priority ?? null,
        dueDate: task.dueDate ?? null,
        weekStart: task.weekStart,
        weekEnd: task.weekEnd,
        done: false,
      })
    }
  })

  const grades = data.grades ?? {}
  for (const [className, gradeData] of Object.entries(grades)) {
    const classId = classIdByName[className]
    if (!classId) continue
    const existingComponents = getState().grades?.[semId]?.[classId]?.components ?? []
    const existingComponentNames = new Set(existingComponents.map(c => c.name))
    const newComponents = (gradeData.components ?? [])
      .map(({ grade: _g, ...c }) => ({ id: nanoid(), ...c, grade: null }))
      .filter(c => !existingComponentNames.has(c.name))
    if (newComponents.length) {
      setGradeComponents(semId, classId, [...existingComponents, ...newComponents])
    }
    if (gradeData.targetGrade != null && existingComponents.length === 0) {
      setTargetGrade(semId, classId, gradeData.targetGrade)
    }
  }
}

function _populateSemester(semId, data, actions) {
  const { addClass, addHoliday, setGradeComponents, setTargetGrade, addTask, getClasses } = actions

  const classes = data.classes ?? []
  classes.forEach(cls => addClass({ semesterId: semId, name: cls.name, ects: cls.ects ?? 6, color: cls.color }))

  const addedClasses = getClasses().filter(c => c.semesterId === semId)
  const classIdByName = Object.fromEntries(addedClasses.map(c => [c.name, c.id]))

  ;(data.holidays ?? []).forEach(h =>
    addHoliday(semId, { name: h.name, startDate: h.startDate, endDate: h.endDate })
  )

  ;(data.tasks ?? []).forEach(task =>
    addTask({
      semesterId: semId,
      classId: task.className ? (classIdByName[task.className] ?? null) : null,
      title: task.title,
      priority: task.priority ?? null,
      dueDate: task.dueDate ?? null,
      weekStart: task.weekStart,
      weekEnd: task.weekEnd,
      done: task.done ?? false,
    })
  )

  const grades = data.grades ?? {}
  for (const [className, gradeData] of Object.entries(grades)) {
    const classId = classIdByName[className]
    if (!classId) continue
    const components = (gradeData.components ?? []).map(({ grade: _g, ...c }) => ({ id: nanoid(), ...c, grade: null }))
    if (components.length) setGradeComponents(semId, classId, components)
    if (gradeData.targetGrade != null) setTargetGrade(semId, classId, gradeData.targetGrade)
  }
}
