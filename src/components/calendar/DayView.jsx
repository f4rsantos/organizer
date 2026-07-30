import { HourGrid } from './HourGrid'

export function DayView({ day, tasks, holidays, events, classes, onOpenEvent, onCreateRange }) {
  return (
    <HourGrid days={[day]} tasks={tasks} holidays={holidays} events={events} classes={classes}
      onOpenEvent={onOpenEvent} onCreateRange={onCreateRange} />
  )
}
