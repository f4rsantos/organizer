export const CARRY_KEYS = ['kanban', 'events', 'tasks']

function eventEndDate(event) {
  return event.endDate ?? event.date ?? event.startDate ?? null
}

export function isKanbanCarryCandidate(task, oldSemesterId) {
  return task.semesterId === oldSemesterId && !task.done && task.kanban != null
}

export function isTaskCarryCandidate(task, oldSemesterId, fromDate) {
  if (task.semesterId !== oldSemesterId || task.done) return false
  const end = task.weekEnd ?? task.dueDate
  return end != null && end >= fromDate
}

export function isEventCarryCandidate(event, oldSemesterId, fromDate) {
  if (event.semesterId !== oldSemesterId) return false
  const end = eventEndDate(event)
  return end != null && end >= fromDate
}

export function countCarryCandidates(state, oldSemesterId, fromDate) {
  const tasks = state.tasks ?? []
  const events = state.events ?? []
  return {
    kanban: tasks.filter(t => isKanbanCarryCandidate(t, oldSemesterId)).length,
    tasks: tasks.filter(t => isTaskCarryCandidate(t, oldSemesterId, fromDate)).length,
    events: events.filter(e => isEventCarryCandidate(e, oldSemesterId, fromDate)).length,
  }
}

export function remapCarriedTasks(tasks, { oldSemesterId, newSemesterId, fromDate, carry, classIdByOldId }) {
  return tasks.map(task => {
    const carried =
      (carry.kanban && isKanbanCarryCandidate(task, oldSemesterId)) ||
      (carry.tasks && isTaskCarryCandidate(task, oldSemesterId, fromDate))
    if (!carried) return task
    const classId = task.classId ? classIdByOldId[task.classId] ?? null : null
    return { ...task, semesterId: newSemesterId, classId }
  })
}

export function remapCarriedEvents(events, { oldSemesterId, newSemesterId, fromDate, carry }) {
  if (!carry.events) return events
  return events.map(event =>
    isEventCarryCandidate(event, oldSemesterId, fromDate)
      ? { ...event, semesterId: newSemesterId }
      : event
  )
}

export function buildClassIdMap(classes, oldSemesterId, newSemesterId) {
  const newIdByName = new Map(
    classes.filter(c => c.semesterId === newSemesterId).map(c => [c.name, c.id])
  )
  return Object.fromEntries(
    classes
      .filter(c => c.semesterId === oldSemesterId)
      .map(c => [c.id, newIdByName.get(c.name) ?? null])
  )
}
