import { differenceInCalendarDays, parseISO } from 'date-fns'

const CODES = { bold: [1, 22], dim: [2, 22], red: [31, 39], green: [32, 39], yellow: [33, 39], blue: [34, 39], magenta: [35, 39], cyan: [36, 39] }
const WEEKDAY_INDEX_OFFSET = 6
const TIME_COLUMN = 11

export function createPainter(enabled) {
  const paint = {}
  for (const [name, [open, close]] of Object.entries(CODES)) {
    paint[name] = text => (enabled ? `\u001b[${open}m${text}\u001b[${close}m` : String(text))
  }
  return paint
}

export function dayHeading(dateISO, now, t) {
  const day = parseISO(dateISO)
  const weekday = t.weekdays[(day.getDay() + WEEKDAY_INDEX_OFFSET) % 7]
  const label = `${weekday}, ${day.getDate()} ${t.months[day.getMonth()]}`
  const diff = differenceInCalendarDays(day, now)
  if (diff === 0) return `${label} · ${t.widgetTodayLabel}`
  if (diff === 1) return `${label} · ${t.widgetTomorrowLabel}`
  return label
}

function timeColumn(range, t) {
  if (!range) return t.eventAllDay
  const start = range.start ?? '…'
  const end = range.end ?? (range.continues === 'after' ? '…' : '')
  return end ? `${start}–${end}` : start
}

export function agendaItemLine(item, t, paint) {
  const time = timeColumn(item.range, t).padEnd(TIME_COLUMN)
  const marker = item.kind === 'event' ? paint.cyan('●') : item.done ? paint.green('✓') : paint.yellow('○')
  const title = item.done ? paint.dim(item.title) : item.title
  const extra = item.className ? paint.dim(` · ${item.className}`) : ''
  return `  ${paint.dim(time)} ${marker} ${title}${extra}`
}

export function formatAgenda(agenda, { now, t, paint }) {
  const lines = []
  if (agenda.overdue.length) {
    lines.push(paint.red(paint.bold(t.cliOverdue)))
    agenda.overdue.forEach(item => lines.push(agendaItemLine(item, t, paint)))
    lines.push('')
  }
  for (const day of agenda.days) {
    lines.push(paint.bold(dayHeading(day.date, now, t)))
    if (!day.items.length) lines.push(paint.dim(`  ${t.calendarDayEmpty}`))
    day.items.forEach(item => lines.push(agendaItemLine(item, t, paint)))
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

export function formatTaskList(tasks, { t, paint, classes }) {
  if (!tasks.length) return paint.dim(t.cliNoOpenTasks)
  return tasks.map(task => {
    const cls = classes.find(c => c.id === task.classId)
    const due = task.dueDate ? paint.dim(` · ${task.dueDate}`) : ''
    const tag = cls ? paint.magenta(` [${cls.name}]`) : ''
    const marker = task.done ? paint.green('✓') : paint.yellow('○')
    return `  ${marker} ${task.title}${tag}${due}`
  }).join('\n')
}

const EFFECT_MARKERS = { create: '+', update: '~', remove: '-', habit: '✓', grade: '~', navigate: '→', focus: '◷', shared: '~' }

export function formatEffects(effects, { t, paint }) {
  if (!effects.length) return paint.dim(t.cliNothingHappened)
  return effects.map(effect => {
    const marker = EFFECT_MARKERS[effect.type] ?? '•'
    const color = effect.type === 'remove' ? paint.red : effect.type === 'create' ? paint.green : paint.cyan
    const label = effect.title ?? effect.target ?? effect.action ?? ''
    return `  ${color(marker)} ${label}`
  }).join('\n')
}
