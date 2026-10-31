import { eachDayOfInterval, format } from 'date-fns'
import { eventDateRange } from '../calendar/dayAgenda.js'

const MIN_NAME_CHARS = 3
const MAX_HIGHLIGHT_SPAN_DAYS = 62

const EXAM_WORDS = new Set([
  'exam', 'exams', 'exame', 'exames', 'examen', 'examens', 'test', 'tests', 'teste', 'testes',
  'minitest', 'miniteste', 'prova', 'provas', 'quiz', 'midterm', 'frequencia', 'parcial', 'partiel',
  'prufung', 'klausur', 'zkouska', 'eksamen', 'toets',
])

const TYPE_CODES = [
  { type: 'TP', pattern: /^tp\d*$/ },
  { type: 'PL', pattern: /^pl\d*$/ },
  { type: 'OT', pattern: /^ot\d*$/ },
  { type: 'EST', pattern: /^est\d*$/ },
  { type: 'FORA', pattern: /^fora\d*$/ },
  { type: 'T', pattern: /^t\d*$/ },
  { type: 'P', pattern: /^p\d*$/ },
  { type: 'S', pattern: /^s\d*$/ },
]

const TYPE_WORDS = [
  { type: 'TP', words: ['teoricopratica', 'teoricopraticas'] },
  { type: 'PL', words: ['lab', 'labs', 'laboratorio', 'laboratory', 'laboratoire', 'labor', 'praktikum'] },
  { type: 'OT', words: ['tutorial', 'tutoria', 'tutorials'] },
  { type: 'S', words: ['seminario', 'seminarios', 'seminar', 'seminars', 'seminaire'] },
  { type: 'EST', words: ['estagio', 'internship', 'praktikum'] },
  { type: 'T', words: ['lecture', 'theory', 'theoretical', 'teorica', 'teoricas', 'teorico', 'cours', 'vorlesung', 'prednaska'] },
  { type: 'P', words: ['practical', 'practice', 'pratica', 'praticas', 'practica', 'ubung', 'cviceni'] },
]

export const LESSON_TYPES = ['T', 'TP', 'P', 'PL', 'OT', 'S', 'FORA', 'EST']
export const OTHER_LESSON_TYPE = 'other'

function foldText(text) {
  return String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function titleWords(title) {
  return foldText(title).split(/[^a-z0-9]+/).filter(Boolean)
}

function compact(text) {
  return foldText(text).replace(/[^a-z0-9]/g, '')
}

function longestBy(items, lengthOf) {
  return items.reduce((best, item) => (!best || lengthOf(item) > lengthOf(best) ? item : best), null)
}

function mentions(name, key, words) {
  if (name.length >= MIN_NAME_CHARS) return key.includes(name)
  return words.includes(name)
}

export function classForEvent(event, classes) {
  if (!classes?.length) return null
  if (event?.classId) return classes.find(c => c.id === event.classId) ?? null
  const key = compact(event?.title)
  if (!key) return null
  const words = titleWords(event.title)
  const named = classes.map(cls => ({ cls, name: compact(cls.name) })).filter(c => c.name)
  const exact = named.find(c => c.name === key)
  if (exact) return exact.cls
  const mentioned = longestBy(named.filter(c => mentions(c.name, key, words)), c => c.name.length)
  if (mentioned) return mentioned.cls
  if (key.length < MIN_NAME_CHARS) return null
  return named.find(c => c.name.startsWith(key))?.cls ?? null
}

export function classNameUnlessInTitle(title, className) {
  if (!className) return null
  const name = compact(className)
  return mentions(name, compact(title), titleWords(title)) ? null : className
}

export function isExamTitle(title) {
  return titleWords(title).some(word => EXAM_WORDS.has(word))
}

export function isExamEvent(event) {
  return event?.assessment === true || isExamTitle(event?.title)
}

export function isLessonEvent(event, classes) {
  return Boolean(classForEvent(event, classes)) && !isExamEvent(event)
}

export function inferLessonType(title) {
  const words = titleWords(title)
  const byCode = TYPE_CODES.find(({ pattern }) => words.some(word => pattern.test(word)))
  if (byCode) return byCode.type
  const byWord = TYPE_WORDS.find(({ words: list }) => words.some(word => list.includes(word)))
  return byWord?.type ?? OTHER_LESSON_TYPE
}

function rangeDays(range) {
  if (!range || range.end < range.start) return []
  const days = eachDayOfInterval(range)
  return days.slice(0, MAX_HIGHLIGHT_SPAN_DAYS)
}

export function nonClassEventDates(events, classes) {
  const dates = new Set()
  for (const event of events ?? []) {
    if (isLessonEvent(event, classes)) continue
    for (const day of rangeDays(event._range ?? eventDateRange(event))) dates.add(format(day, 'yyyy-MM-dd'))
  }
  return dates
}
