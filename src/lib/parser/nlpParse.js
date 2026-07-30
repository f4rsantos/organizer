import { Pipeline } from './Pipeline.js'
import { TimeParser } from './parsers/TimeParser.js'
import { DateParser } from './parsers/DateParser.js'
import { RecurrenceParser } from './parsers/RecurrenceParser.js'
import { DurationParser } from './parsers/DurationParser.js'
import { EntityParser } from './parsers/EntityParser.js'
import { PriorityParser } from './parsers/PriorityParser.js'
import { ActionParser } from './parsers/ActionParser.js'
import { format, isValid } from 'date-fns'
import { tokenize, getUnconsumedText } from './tokenizer.js'
import { getLocalePack } from './locales/index.js'

const parsers = [
  new DateParser(),
  new TimeParser(),
  new RecurrenceParser(),
  new DurationParser(),
  new PriorityParser(),
  new ActionParser(),
  new EntityParser()
]

const pipeline = new Pipeline(parsers)



export function parseTaskText(text, context = {}) {
  const tokens = tokenize(text)
  return parseTaskTokens(tokens, context)
}



export function parseTaskTokens(tokens, context = {}) {
  const finalContext = { ...context, locale: context.locale || getLocalePack(context.lang) }
  const matches = pipeline.execute(tokens, finalContext)
  
  const result = {
    title: getUnconsumedText(tokens),
    date: null,
    week: null,
    startTime: null,
    endTime: null,
    classId: null,
    teamId: null,
    columnId: null,
    recurrence: null,
    duration: null,
    priority: null,
    action: null
  }

  for (const m of matches) {
    if (m.type === 'date_slash' || m.type === 'date_relative' || m.type === 'date_weekday') {
      if (isValid(m.value.date)) result.date = format(m.value.date, 'yyyy-MM-dd')
    } else if (m.type === 'week_number') {
      result.week = m.value.week
    } else if (m.type === 'time_range') {
      result.startTime = m.value.startTime
      result.endTime = m.value.endTime
    } else if (m.type === 'time_single') {
      result.startTime = m.value.startTime
    } else if (m.type === 'class') {
      result.classId = m.value.classId
    } else if (m.type === 'team') {
      result.teamId = m.value.teamId
    } else if (m.type === 'column') {
      result.columnId = m.value.columnId
    } else if (m.type === 'recurrence') {
      result.recurrence = m.value
    } else if (m.type === 'duration') {
      result.duration = m.value
    } else if (m.type === 'priority') {
      result.priority = m.value
    } else if (m.type === 'action') {
      result.action = m.value
    }
  }

  return result
}
