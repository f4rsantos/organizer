const REST_TEXT = {
  clear: t => t.todayRestClear,
  weekend: t => t.todayRestWeekend,
  holiday: (t, item) => t.todayRestHoliday(item.name),
}

export function briefText(t, item) {
  if (item.kind === 'study' && item.reason === 'exam') return t.todayStudyExam(item.className, item.daysLeft)
  if (item.kind === 'study') return t.todayStudyBacklog(item.className, item.pending)
  return REST_TEXT[item.reason](t, item)
}
