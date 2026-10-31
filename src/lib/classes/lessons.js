import { classForEvent, inferLessonType, isExamEvent } from './classEvents.js'

export const DEFAULT_STUDY_TYPES = [{ id: 'attend' }, { id: 'slides' }, { id: 'exercises' }, { id: 'summary' }]

const ALMOST_DONE_RATIO = 0.75

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function calendarKey(event) {
  return `cal:${event.templateId ?? event.id}:${event.date}`
}

function lessonDate(event) {
  return event.date ?? event.startDate ?? null
}

function hasHappened(event, today, nowTime) {
  if (!event.date || event.date > today) return false
  if (event.date < today || !nowTime || !event.startTime) return true
  return event.startTime <= nowTime
}

function belongsTo(event, cls) {
  return classForEvent(event, [cls]) === cls && !isExamEvent(event)
}

function calendarSession(event, saved) {
  return {
    key: calendarKey(event),
    date: lessonDate(event),
    startTime: event.startTime ?? null,
    type: inferLessonType(`${event.title ?? ''} ${event.note ?? ''}`),
    theme: '',
    topics: [],
    studied: {},
    ...saved,
    manual: false,
  }
}

function manualSession(key, saved) {
  return { key, type: 'other', theme: '', topics: [], studied: {}, ...saved, manual: true }
}

export function lessonSessions({ cls, events, record, today, nowTime }) {
  const saved = record?.sessions ?? {}
  const fromCalendar = (events ?? [])
    .map(event => ({ ...event, date: lessonDate(event) }))
    .filter(event => hasHappened(event, today, nowTime) && belongsTo(event, cls))
    .map(event => calendarSession(event, saved[calendarKey(event)]))
  const calendarKeys = new Set(fromCalendar.map(s => s.key))
  const manual = Object.entries(saved)
    .filter(([key, value]) => value?.manual && !calendarKeys.has(key))
    .map(([key, value]) => manualSession(key, value))
  return [...fromCalendar, ...manual]
    .filter(session => !session.skipped)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? ''))
}

function studiedCount(session, studyTypes) {
  return studyTypes.filter(type => session?.studied?.[type.id]).length
}

export function sessionProgress(session, studyTypes) {
  if (!studyTypes.length) return 0
  return studiedCount(session, studyTypes) / studyTypes.length
}

export function classProgress(sessions, studyTypes) {
  const total = sessions.length * studyTypes.length
  const done = sessions.reduce((sum, session) => sum + studiedCount(session, studyTypes), 0)
  return { done, total, pct: total ? done / total : 0 }
}

export function progressBucket({ pct, total }) {
  if (!total || pct <= 0) return 'todo'
  if (pct >= 1) return 'done'
  if (pct >= ALMOST_DONE_RATIO) return 'almost'
  return 'doing'
}

export function arrangeSessions(sessions, { order, type }) {
  const kept = type === 'all' ? sessions : sessions.filter(s => s.type === type)
  const direction = order === 'newest' ? -1 : 1
  return [...kept].sort((a, b) => direction * a.date.localeCompare(b.date))
}

function withClassRecord(lessons, classId, update) {
  const current = lessons?.[classId] ?? { sessions: {} }
  return { ...(lessons ?? {}), [classId]: update({ ...current, sessions: current.sessions ?? {} }) }
}

export function withSessionPatch(lessons, classId, key, patch) {
  return withClassRecord(lessons, classId, record => ({
    ...record,
    sessions: { ...record.sessions, [key]: { ...record.sessions[key], ...patch } },
  }))
}

export function withManualSession(lessons, classId, { key, date, type }) {
  return withSessionPatch(lessons, classId, key, { manual: true, date, type })
}

export function withoutSession(lessons, classId, key) {
  return withClassRecord(lessons, classId, record => {
    const sessions = { ...record.sessions }
    if (sessions[key]?.manual) delete sessions[key]
    else sessions[key] = { ...sessions[key], skipped: true }
    return { ...record, sessions }
  })
}

function normalizeRecord(record) {
  if (!isPlainObject(record)) return null
  const sessions = isPlainObject(record.sessions) ? record.sessions : {}
  return { sessions }
}

export function normalizeLessons(value) {
  if (!isPlainObject(value)) return null
  const entries = Object.entries(value)
    .map(([classId, record]) => [classId, normalizeRecord(record)])
    .filter(([, record]) => record)
  return entries.length ? Object.fromEntries(entries) : null
}

export function classSummary({ cls, events, record, today, nowTime, studyTypes }) {
  const sessions = lessonSessions({ cls, events, record, today, nowTime })
  const progress = classProgress(sessions, studyTypes)
  const pending = sessions.filter(session => sessionProgress(session, studyTypes) < 1).length
  return { cls, studyTypes, sessions, progress, pending, bucket: progressBucket(progress) }
}
