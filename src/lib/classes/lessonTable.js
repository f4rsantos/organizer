import { sessionProgress } from './lessons.js'

function lessonNumber(row) {
  return String(row.session.number ?? '').trim().replace(/_/g, '.')
}

function blankNumbersLast(a, b) {
  return Number(!lessonNumber(a)) - Number(!lessonNumber(b))
}

function compareNumbers(a, b) {
  return lessonNumber(a).localeCompare(lessonNumber(b), undefined, { numeric: true })
}

const COMPARATORS = {
  number: compareNumbers,
  date: (a, b) => a.session.date.localeCompare(b.session.date),
  class: (a, b) => a.cls.name.localeCompare(b.cls.name),
  type: (a, b) => a.session.type.localeCompare(b.session.type),
  progress: (a, b) => a.progress - b.progress,
}

const STATUS_FILTERS = {
  all: () => true,
  pending: row => row.progress < 1,
  done: row => row.progress >= 1,
}

export function lessonTableRows(summaries, studySteps, { classId, type, status, sort }) {
  const direction = sort.dir === 'asc' ? 1 : -1
  const compare = COMPARATORS[sort.key] ?? COMPARATORS.date
  const ordered = (a, b) => (sort.key === 'number' && blankNumbersLast(a, b)) || direction * compare(a, b)
  return summaries
    .filter(summary => classId === 'all' || summary.cls.id === classId)
    .flatMap(summary => summary.sessions.map(session => ({
      cls: summary.cls,
      session,
      progress: sessionProgress(session, studySteps),
    })))
    .filter(row => type === 'all' || row.session.type === type)
    .filter(STATUS_FILTERS[status] ?? STATUS_FILTERS.all)
    .sort((a, b) => ordered(a, b) || COMPARATORS.date(b, a))
}
