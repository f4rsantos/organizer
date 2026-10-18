import { differenceInCalendarDays, isValid, parseISO } from 'date-fns'
import { mutationTarget } from './execute.js'

const WEEKDAY_NAME_DAYS = 6
const WEEKDAY_INDEX_OFFSET = 6

function dateChip(date, t, now) {
  const day = date ? parseISO(date) : null
  if (!day || !isValid(day)) return null
  const diff = differenceInCalendarDays(day, now)
  if (diff === 0) return t.widgetTodayLabel
  if (diff === 1) return t.widgetTomorrowLabel
  if (diff > 1 && diff <= WEEKDAY_NAME_DAYS) return t.weekdays[(day.getDay() + WEEKDAY_INDEX_OFFSET) % 7]
  return `${day.getDate()} ${t.months[day.getMonth()].slice(0, 3)}`
}

function timeChip(item) {
  if (!item.startTime) return null
  return item.endTime ? `${item.startTime}–${item.endTime}` : item.startTime
}

function createRow(item, ctx) {
  const cls = (ctx.classes ?? []).find(c => c.id === item.classId)
  const column = item.kind === 'kanbanCard' ? (ctx.columns ?? []).find(c => c.id === item.columnId) : null
  const chips = [
    dateChip(item.date, ctx.t, ctx.now),
    item.week && !item.date ? ctx.t.weekLabel(item.week) : null,
    timeChip(item),
    cls?.name,
    item.priority ? `P${item.priority}` : null,
    column?.title,
  ].filter(Boolean)
  return {
    kind: item.kind,
    title: item.title,
    chips,
    repeats: Boolean(item.recurrence),
    alsoCalendar: Boolean(item.showOnCalendar),
    color: cls?.color ?? null,
  }
}

function mutationRow(item, ctx) {
  const target = mutationTarget(item, ctx)
  const title = target?.task?.title ?? target?.habit?.title ?? item.query
  return { kind: 'mutation', action: item.action, title, missing: !target, targetKind: target?.kind ?? null, chips: [] }
}

const ROW_BUILDERS = {
  mutation: mutationRow,
  navigation: item => ({ kind: 'navigation', title: item.target, chips: [] }),
  focus: item => ({ kind: 'focus', action: item.action, title: '', chips: [item.workMins && `${item.workMins}′`, item.breakMins && `${item.breakMins}′`].filter(Boolean) }),
  gradeAction: item => ({ kind: 'gradeAction', title: item.componentName ?? '', chips: item.grade != null ? [String(item.grade)] : [] }),
  noteAction: item => ({ kind: 'noteAction', action: item.type, title: item.title ?? item.name ?? '', chips: [] }),
}

export function previewQuickAction(items, ctx) {
  return items.map(item => (ROW_BUILDERS[item.kind] ?? createRow)(item, ctx))
}
