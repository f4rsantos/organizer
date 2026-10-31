import { LESSON_TYPES } from '@/lib/classes/classEvents'

const DONE_COLOR = 'var(--done, #22c55e)'

const STUDY_TYPE_KEYS = {
  attend: 'classesStudyAttend',
  slides: 'classesStudySlides',
  exercises: 'classesStudyExercises',
  summary: 'classesStudySummary',
}

export function lessonTypeLabel(t, type, lessonTypes) {
  const custom = lessonTypes?.find(entry => entry.id === type)?.label
  if (custom) return custom
  return LESSON_TYPES.includes(type) ? type : t.classesTypeOther
}

export function studyTypeLabel(t, studyType) {
  return studyType.label ?? t[STUDY_TYPE_KEYS[studyType.id]] ?? studyType.id
}

export function progressColor(pct, color) {
  return pct >= 1 ? DONE_COLOR : color
}
