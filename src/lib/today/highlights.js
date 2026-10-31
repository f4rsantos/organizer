import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { expandTasksForRange } from '../recurrence.js'
import { boardIdForTask } from '../taskUtils.js'
import { classForEvent, isExamEvent, isExamTitle, isLessonEvent } from '../classes/classEvents.js'

export const HIGHLIGHT_HORIZON_DAYS = 14
const KIND_RANK = { exam: 0, task: 1, card: 1, event: 2 }
const KIND_SOURCES = { exam: 'exams', event: 'events', task: 'tasks', card: 'cards' }
const ALL_SOURCES = { exams: true, events: true, tasks: true, cards: true }

function inWindow(date, today, horizonEnd) {
  return Boolean(date) && date >= today && date <= horizonEnd
}

function highlight(kind, { id, title, date, cls }, today) {
  return {
    kind,
    id,
    title,
    date,
    daysLeft: differenceInCalendarDays(parseISO(date), parseISO(today)),
    classId: cls?.id ?? null,
    className: cls?.name ?? null,
  }
}

function eventHighlights(events, classes, today, horizonEnd) {
  return (events ?? [])
    .map(event => ({ event, date: event.date ?? event.startDate }))
    .filter(({ event, date }) => inWindow(date, today, horizonEnd) && !isLessonEvent(event, classes))
    .map(({ event, date }) => highlight(isExamEvent(event) ? 'exam' : 'event',
      { id: event.id, title: event.title, date, cls: classForEvent(event, classes) }, today))
}

function columnTitle(task, kanban) {
  const columns = kanban?.[boardIdForTask(task)]?.columns ?? []
  return columns.find(column => column.id === task.kanban?.columnId)?.title ?? null
}

function taskKind(task) {
  if (isExamTitle(task.title)) return 'exam'
  if (task.views?.list === false && task.kanban?.columnId) return 'card'
  return 'task'
}

function taskHighlights(tasks, classes, kanban, today, horizonEnd) {
  const dated = (tasks ?? []).filter(task => task?.dueDate)
  return expandTasksForRange(dated, parseISO(today), parseISO(horizonEnd))
    .filter(task => !task.done && !task.skipped && inWindow(task.dueDate, today, horizonEnd))
    .map(task => {
      const kind = taskKind(task)
      const item = highlight(kind, { id: task.templateId ?? task.id, title: task.title, date: task.dueDate, cls: classForEvent(task, classes) }, today)
      return kind === 'card' ? { ...item, column: columnTitle(task, kanban) } : item
    })
}

export function buildHighlights({ today, classes, events, tasks, kanban, sources = ALL_SOURCES, horizonDays = HIGHLIGHT_HORIZON_DAYS }) {
  const horizonEnd = format(addDays(parseISO(today), horizonDays), 'yyyy-MM-dd')
  return [...eventHighlights(events, classes, today, horizonEnd), ...taskHighlights(tasks, classes, kanban, today, horizonEnd)]
    .filter(item => sources[KIND_SOURCES[item.kind]])
    .sort((a, b) => a.daysLeft - b.daysLeft || KIND_RANK[a.kind] - KIND_RANK[b.kind])
}

export function attachStudy(highlights, study) {
  if (!study?.classId) return highlights
  const index = highlights.findIndex(item => item.kind === 'exam' && item.classId === study.classId)
  if (index < 0) return highlights
  return highlights.map((item, i) => (i === index ? { ...item, study } : item))
}

export function layoutToday({ brief, highlights, count }) {
  const study = brief.find(item => item.kind === 'study')
  const withStudy = attachStudy(highlights, study)
  const leads = withStudy.slice(0, count)
  const rest = brief.find(item => item.kind === 'rest')
  const headlines = leads.length ? leads : [rest].filter(Boolean)
  const shown = new Set(headlines)
  const studyShown = headlines.some(item => item.study)
  return {
    headlines,
    upcoming: withStudy.slice(count),
    recommendationItems: brief.filter(item => !shown.has(item) && !(item === study && studyShown)),
    excludeIds: new Set(leads.map(item => item.id)),
  }
}
