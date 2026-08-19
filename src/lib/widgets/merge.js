import { boardIdForTask, taskToCard, FREE_BOARD_ID } from '@/lib/taskUtils'
import { isSharedLocalHidden } from '@/lib/collab/mergeUtils'

function activeTeamIds(state) {
  const collabEnabled = state.settings?.collabEnabled === true
  const memberships = collabEnabled ? (state.collab?.memberships ?? []) : []
  return new Set(memberships.map(m => m.teamId))
}

function remoteMemberships(state, boardId) {
  const collabEnabled = state.settings?.collabEnabled === true
  if (!collabEnabled) return []
  if (boardId !== undefined && boardId !== (state.activeSemesterId ?? FREE_BOARD_ID)) return []
  return state.collab?.memberships ?? []
}

export function mergedTasks(state) {
  const teams = state.collabRuntime?.teams ?? {}
  const ids = activeTeamIds(state)
  const local = (state.tasks ?? []).filter(
    task => !isSharedLocalHidden(task, ids, teams),
  )

  const remote = remoteMemberships(state).flatMap(membership => {
    const shared = teams[membership.teamId]?.state?.tasks ?? []
    return shared.map(task => ({
      ...task,
      id: `shared:${membership.teamId}:${task.id}`,
      done: !!task?.doneForAll || !!task?.doneBy?.[membership.memberUserId],
      semesterId: state.activeSemesterId ?? null,
    }))
  })

  return [...local, ...remote]
}

export function mergedKanban(state, boardId) {
  const teams = state.collabRuntime?.teams ?? {}
  const ids = activeTeamIds(state)
  const board = state.kanban?.[boardId]

  const localCards = (state.tasks ?? [])
    .filter(task => boardIdForTask(task) === boardId && task.views?.kanban && task.kanban)
    .filter(task => !isSharedLocalHidden(task, ids, teams))
    .map(taskToCard)

  const remoteCards = remoteMemberships(state, boardId).flatMap(membership => {
    const cards = teams[membership.teamId]?.state?.kanban?.cards ?? []
    const valid = new Set((board?.columns ?? []).map(col => col.id))
    return cards.map(card => ({
      ...card,
      id: `shared:${membership.teamId}:${card.id}`,
      columnId: valid.has(card.columnId) ? card.columnId : (board?.columns?.[0]?.id ?? null),
    }))
  })

  return { columns: board?.columns ?? [], cards: [...localCards, ...remoteCards] }
}
