import { classNameUnlessInTitle } from '@/lib/classes/classEvents'

const KIND_LABEL_KEYS = { exam: 'todayKindExam', task: 'todayKindTask', card: 'todayKindCard', event: 'todayKindEvent' }
const KIND_TABS = { exam: 'calendar', event: 'calendar', task: 'tasks', card: 'kanban' }

export const HIGHLIGHT_KINDS = Object.keys(KIND_TABS)

export function highlightKindLabel(t, item) {
  return t[KIND_LABEL_KEYS[item.kind]]
}

export function highlightTab(item) {
  return KIND_TABS[item.kind] ?? null
}

export function highlightContext(item) {
  if (item.kind === 'card') return item.column
  return classNameUnlessInTitle(item.title, item.className)
}

export function countdownLabel(t, daysLeft) {
  return daysLeft === 0 ? t.todayDueToday : t.todayDaysUntil(daysLeft)
}
