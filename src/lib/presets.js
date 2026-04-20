export const PRESET_SEQUENCE = ['1a1s', '1a2s', '2a1s', '2a2s', '3a1s', '3a2s']

export const PRESET_GROUPS = {
  EI: ['1a1s', '1a2s', '2a1s', '2a2s', '3a1s', '3a2s'],
  generic: ['s1', 's2'],
}

export function getNextPresetKey(currentKey) {
  const idx = PRESET_SEQUENCE.indexOf(currentKey)
  if (idx === -1 || idx === PRESET_SEQUENCE.length - 1) return null
  return PRESET_SEQUENCE[idx + 1]
}

export async function fetchPreset(key) {
  const url = `${import.meta.env.BASE_URL}preset-${key}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`preset-${key} not found`)
  const data = await res.json()
  if (!data.version) throw new Error('Invalid preset')
  return data
}

export async function checkPresetExists(key) {
  try {
    const url = `${import.meta.env.BASE_URL}preset-${key}.json`
    const res = await fetch(url)
    return res.ok
  } catch {
    return false
  }
}

function mapGrades(semGrades, semId, classIdMap, setGradeComponents, setTargetGrade) {
  for (const [oldId, gradeData] of Object.entries(semGrades)) {
    const newId = classIdMap[oldId]
    if (!newId) continue
    if (gradeData.components) setGradeComponents(semId, newId, gradeData.components)
    if (gradeData.targetGrade != null) setTargetGrade(semId, newId, gradeData.targetGrade)
  }
}

function mapTasks(tasks, oldSemId, semId, classIdMap, addTask) {
  tasks.filter(t => t.semesterId === oldSemId).forEach(task =>
    addTask({
      semesterId: semId, classId: task.classId ? (classIdMap[task.classId] ?? null) : null,
      title: task.title, priority: task.priority, dueDate: task.dueDate ?? null,
      weekStart: task.weekStart, weekEnd: task.weekEnd, done: task.done ?? false,
    })
  )
}

function mapSemester(sem, data, actions, presetKey) {
  const { addSemester, addClass, addHoliday, setGradeComponents, setTargetGrade, addTask, getClasses } = actions
  const semId = addSemester({ name: sem.name, startDate: sem.startDate, endDate: sem.endDate, presetKey })
  const semClasses = (data.classes ?? []).filter(c => c.semesterId === sem.id)
  semClasses.forEach(cls => addClass({ semesterId: semId, name: cls.name, ects: cls.ects, color: cls.color }))
  ;(data.holidays ?? []).filter(h => h.semesterId === sem.id)
    .forEach(h => addHoliday(semId, { name: h.name, startDate: h.startDate, endDate: h.endDate }))
  const addedClasses = getClasses().filter(c => c.semesterId === semId)
  const classIdMap = Object.fromEntries(
    semClasses.map(old => [old.id, addedClasses.find(c => c.name === old.name)?.id ?? null])
  )
  mapGrades(data.grades?.[sem.id] ?? {}, semId, classIdMap, setGradeComponents, setTargetGrade)
  mapTasks(data.tasks ?? [], sem.id, semId, classIdMap, addTask)
}

export function applyPreset(data, actions, presetKey) {
  for (const sem of data.semesters ?? []) mapSemester(sem, data, actions, presetKey)
}
