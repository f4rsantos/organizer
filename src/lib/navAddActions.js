export const ADD_ACTION_LABEL_KEYS = {
  task: 'addTask',
  kanban: 'addCard',
  event: 'addEvent',
  note: 'notesNew',
  quickaction: 'quickAction',
}

export function addPickerActionIds({ notesEnabled, quickActionEnabled }) {
  return ['task', 'kanban', 'event', ...(notesEnabled ? ['note'] : []), ...(quickActionEnabled ? ['quickaction'] : [])]
}
