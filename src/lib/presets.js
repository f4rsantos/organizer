import { fetchPresetFromFirebase, fetchPresetMetaFromFirebase, storePresetUpdatedAt } from './presetsFirebase'

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

const GENERIC_FOR_KEY = {
  '1a1s': 's1', '2a1s': 's1', '3a1s': 's1',
  '1a2s': 's2', '2a2s': 's2', '3a2s': 's2',
  'summer': 's2',
}

export const PRESET_GROUPS = {
  EI: ['1a1s', '1a2s', '2a1s', '2a2s', '3a1s', '3a2s'],
  generic: ['s1', 's2'],
}

export function getNextPresetKey(currentKey, previousKey) {
  if (currentKey === 'summer') return AFTER_SUMMER_MAP[previousKey] ?? 's1'
  return NEXT_KEY_MAP[currentKey] ?? null
}

export async function fetchPreset(key) {
  const remote = await fetchPresetFromFirebase(key)
  if (!remote?.data) throw new Error(`preset-${key} not found`)
  storePresetUpdatedAt(key, remote.updatedAt)

  const data = { ...remote.data }

  const genericKey = GENERIC_FOR_KEY[key]
  if (genericKey && !data.startDate) {
    const generic = await fetchPresetFromFirebase(genericKey)
    if (generic?.data) {
      data.startDate = generic.data.startDate ?? ''
      data.endDate = generic.data.endDate ?? ''
      data.holidays = generic.data.holidays ?? []
    }
  }

  return data
}

export async function checkPresetExists(key) {
  const meta = await fetchPresetMetaFromFirebase(key)
  return !!meta
}

export function applyPreset(data, actions, presetKey, previousPresetKey) {
  const { addSemester, addClass, addHoliday, setGradeComponents, setTargetGrade, addTask, getClasses } = actions

  const semData = {
    name: data.name ?? presetKey,
    startDate: data.startDate ?? '',
    endDate: data.endDate ?? '',
    presetKey,
  }
  if (presetKey === 'summer' && previousPresetKey) semData.previousPresetKey = previousPresetKey
  const semId = addSemester(semData)

  _populateSemester(semId, data, actions)
}

export function updatePreset(semId, data, actions) {
  const { deleteClass, deleteHoliday, getClasses, getState } = actions
  const existingClasses = getClasses().filter(c => c.semesterId === semId)
  existingClasses.forEach(c => deleteClass(c.id))

  const existingHolidays = (getState().holidays ?? []).filter(h => h.semesterId === semId)
  existingHolidays.forEach(h => deleteHoliday(h.id))

  const existingTasks = (getState().tasks ?? []).filter(t => t.semesterId === semId)
  existingTasks.forEach(t => actions.deleteTask(t.id))

  _populateSemester(semId, data, actions)
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
    const components = (gradeData.components ?? []).map(({ grade: _g, ...c }) => c)
    if (components.length) setGradeComponents(semId, classId, components)
    if (gradeData.targetGrade != null) setTargetGrade(semId, classId, gradeData.targetGrade)
  }
}
