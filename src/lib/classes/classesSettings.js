import { DEFAULT_STUDY_TYPES } from './lessons.js'
import { LESSON_TYPES } from './classEvents.js'

const DEFAULT_LESSON_TYPES = LESSON_TYPES.map(id => ({ id }))
const LEGACY_DEFAULT_LESSON_TYPES = ['T', 'TP', 'P', 'PL', 'other']

function isLegacyDefault(list) {
  return list.length === LEGACY_DEFAULT_LESSON_TYPES.length
    && list.every((entry, index) => entry.id === LEGACY_DEFAULT_LESSON_TYPES[index] && !entry.label)
}

function lessonTypesFrom(value) {
  const list = cleanEntries(value)
  return list.length && !isLegacyDefault(list) ? list : DEFAULT_LESSON_TYPES
}
export const CLASSES_VIEWS = ['overview', 'table']

function cleanEntries(list) {
  if (!Array.isArray(list)) return []
  return list
    .filter(entry => entry && typeof entry === 'object' && typeof entry.id === 'string' && entry.id)
    .map(entry => (typeof entry.label === 'string' && entry.label.trim() ? { id: entry.id, label: entry.label.trim() } : { id: entry.id }))
}

function orDefault(list, fallback) {
  return list.length ? list : fallback
}

export function normalizeClassesSettings(value) {
  return {
    view: CLASSES_VIEWS.includes(value?.view) ? value.view : CLASSES_VIEWS[0],
    studySteps: orDefault(cleanEntries(value?.studySteps), DEFAULT_STUDY_TYPES),
    lessonTypes: lessonTypesFrom(value?.lessonTypes),
  }
}
