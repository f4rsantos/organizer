import { addDays, differenceInCalendarDays, format, isWeekend, parseISO } from 'date-fns'
import { expandTasksForRange } from '../recurrence.js'
import { classForEvent, isExamEvent, isExamTitle, isLessonEvent } from '../classes/classEvents.js'
import { DEFAULT_STUDY_TYPES, classSummary } from '../classes/lessons.js'

export const EXAM_HORIZON_DAYS = 14
const REST_BLOCKING_EXAM_DAYS = 3
const MAX_UPCOMING_EXAMS = 3
const BACKLOG_MIN_PENDING = 2

function daysUntil(today, date) {
  return differenceInCalendarDays(parseISO(date), parseISO(today))
}

function inWindow(date, today, horizonEnd) {
  return Boolean(date) && date >= today && date <= horizonEnd
}

function openTasks(tasks, today, horizonEnd) {
  const dated = (tasks ?? []).filter(task => task?.dueDate)
  return expandTasksForRange(dated, parseISO(today), parseISO(horizonEnd))
    .filter(task => !task.done && !task.skipped && inWindow(task.dueDate, today, horizonEnd))
}

function collectExams({ events, tasks, classes, today, horizonEnd }) {
  const fromEvents = (events ?? [])
    .filter(event => isExamEvent(event) && inWindow(event.date ?? event.startDate, today, horizonEnd))
    .map(event => ({ title: event.title, date: event.date ?? event.startDate, cls: classForEvent(event, classes) }))
  const fromTasks = tasks
    .filter(task => isExamTitle(task.title))
    .map(task => ({ title: task.title, date: task.dueDate, cls: classForEvent(task, classes) }))
  return [...fromEvents, ...fromTasks]
    .map(exam => ({ ...exam, daysLeft: daysUntil(today, exam.date) }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
}

function examItem(exam) {
  const base = { title: exam.title, className: exam.cls?.name ?? null, classId: exam.cls?.id ?? null }
  if (exam.daysLeft === 0) return { kind: 'examToday', ...base }
  return { kind: 'examSoon', ...base, date: exam.date, daysLeft: exam.daysLeft }
}

function todayLessons(events, classes, today) {
  return (events ?? [])
    .filter(event => event.date === today && isLessonEvent(event, classes))
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
    .map(event => {
      const cls = classForEvent(event, classes)
      return { name: cls.name, color: cls.color ?? null, startTime: event.startTime ?? null }
    })
}

function todayOtherEvents(events, classes, today) {
  return (events ?? [])
    .filter(event => event.date === today && !isLessonEvent(event, classes))
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
    .map(event => ({ title: event.title, startTime: event.startTime ?? null, color: event.color ?? null }))
}

function pendingByClass({ classes, events, lessons, today, nowTime, studyTypes }) {
  return classes.map(cls => classSummary({ cls, events, record: lessons?.[cls.id], today, nowTime, studyTypes }))
}

function studySuggestion({ exams, backlog, allowBacklog }) {
  const pendingOf = new Map(backlog.map(entry => [entry.cls.id, entry.pending]))
  const examToPrepare = exams.find(exam => exam.cls && exam.daysLeft > 0 && pendingOf.get(exam.cls.id) > 0)
  if (examToPrepare) {
    const { cls, daysLeft } = examToPrepare
    return { kind: 'study', classId: cls.id, className: cls.name, reason: 'exam', daysLeft, pending: pendingOf.get(cls.id) }
  }
  if (!allowBacklog) return null
  const biggest = backlog.reduce((best, entry) => (entry.pending > (best?.pending ?? 0) ? entry : best), null)
  if (!biggest || biggest.pending < BACKLOG_MIN_PENDING) return null
  return { kind: 'study', classId: biggest.cls.id, className: biggest.cls.name, reason: 'backlog', pending: biggest.pending }
}

export function holidayToday(holidays, today) {
  return (holidays ?? []).find(h => h.startDate <= today && (h.endDate ?? h.startDate) >= today) ?? null
}

function restItem({ holiday, today }) {
  if (holiday) return { kind: 'rest', reason: 'holiday', name: holiday.name }
  if (isWeekend(parseISO(today))) return { kind: 'rest', reason: 'weekend' }
  return { kind: 'rest', reason: 'clear' }
}

export function buildTodayBrief({ today, nowTime, classes, events, tasks, lessons, holidays, studyTypes = DEFAULT_STUDY_TYPES }) {
  const scopedClasses = classes ?? []
  const horizonEnd = format(addDays(parseISO(today), EXAM_HORIZON_DAYS), 'yyyy-MM-dd')
  const upcomingTasks = openTasks(tasks, today, horizonEnd)
  const exams = collectExams({ events, tasks: upcomingTasks, classes: scopedClasses, today, horizonEnd })
  const dueToday = upcomingTasks.filter(task => task.dueDate === today && !isExamTitle(task.title)).length
  const overdue = (tasks ?? []).filter(task => !task?.done && !task?.recurrence && task?.dueDate && task.dueDate < today).length
  const holiday = holidayToday(holidays, today)
  const lessonsToday = todayLessons(events, scopedClasses, today)
  const eventsToday = todayOtherEvents(events, scopedClasses, today)

  const backlog = pendingByClass({ classes: scopedClasses, events, lessons, today, nowTime, studyTypes })
  const study = studySuggestion({ exams, backlog, allowBacklog: !holiday })
  const examsToday = exams.filter(exam => exam.daysLeft === 0)
  const examsSoon = exams.filter(exam => exam.daysLeft > 0).slice(0, MAX_UPCOMING_EXAMS)
  const busy = examsToday.length > 0
    || exams.some(exam => exam.daysLeft <= REST_BLOCKING_EXAM_DAYS)
    || dueToday > 0
    || overdue > 0
    || study?.reason === 'exam'

  return [
    ...examsToday.map(examItem),
    lessonsToday.length ? { kind: 'classesToday', lessons: lessonsToday } : null,
    eventsToday.length ? { kind: 'eventsToday', events: eventsToday } : null,
    dueToday ? { kind: 'tasksDue', count: dueToday } : null,
    overdue ? { kind: 'overdue', count: overdue } : null,
    ...examsSoon.map(examItem),
    study,
    busy ? null : restItem({ holiday, today }),
  ].filter(Boolean)
}

