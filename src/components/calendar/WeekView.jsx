import { eachDayOfInterval } from 'date-fns'
import { HourGrid } from './HourGrid'

export function WeekView({ weekStart, weekEnd, tasks, holidays, events, classes, onOpenEvent, onOpenTask, onCreateRange }) {
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
  return (
    <HourGrid days={days} tasks={tasks} holidays={holidays} events={events} classes={classes}
      onOpenEvent={onOpenEvent} onOpenTask={onOpenTask} onCreateRange={onCreateRange} />
  )
}
