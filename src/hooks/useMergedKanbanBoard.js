import { useMemo } from 'react'
import { useStore } from '@/store/useStore'

const FREE_BOARD_ID = '__free__'
const EMPTY_BOARD = { columns: [], cards: [] }
const EMPTY_TASKS = []
const EMPTY_MEMBERSHIPS = []
const EMPTY_TEAMS = {}

function fallbackColumnId(localBoard) {
  const columns = [...(localBoard?.columns ?? [])].sort((a, b) => a.order - b.order)
  if (!columns.length) return 'col_todo'
  const todo = columns.find(col => col.id.toLowerCase().includes('todo') || col.title.toLowerCase().includes('to do') || col.title.toLowerCase().includes('todo'))
  return todo?.id ?? columns[0].id
}

function mapRemoteCard(card, teamId, localBoard) {
  const validColumns = new Set((localBoard?.columns ?? []).map(col => col.id))
  const columnId = validColumns.has(card.columnId) ? card.columnId : fallbackColumnId(localBoard)
  return {
    ...card,
    id: `shared:${teamId}:${card.id}`,
    columnId,
    sharedMeta: {
      teamId,
      sharedCardId: card.id,
      remote: true,
    },
  }
}

export function useMergedKanbanBoard(semId) {
  const boardId = semId ?? FREE_BOARD_ID
  const localBoard = useStore(s => s.kanban?.[boardId]) ?? EMPTY_BOARD
  const localTasks = useStore(s => s.tasks ?? EMPTY_TASKS)
  const collabEnabled = useStore(s => s.settings?.collabEnabled === true)
  const memberships = useStore(s => s.collab?.memberships ?? EMPTY_MEMBERSHIPS)
  const runtimeTeams = useStore(s => s.collabRuntime?.teams ?? EMPTY_TEAMS)

  return useMemo(() => {
    const activeTeamIds = new Set((collabEnabled ? memberships : []).map(m => m.teamId))
    const hiddenTaskIds = new Set(
      localTasks
        .filter(task => activeTeamIds.has(task?.sharedRef?.teamId))
        .map(task => task.id)
    )

    const localCards = (localBoard.cards ?? []).filter(card => {
      if (!card?.sourceTaskId) return true
      return !hiddenTaskIds.has(card.sourceTaskId)
    })

    const remoteCards = (collabEnabled ? memberships : []).flatMap(membership => {
      const team = runtimeTeams[membership.teamId]
      const cards = team?.state?.kanban?.cards ?? []
      return cards
        .filter(card => card?.semesterId === semId)
        .map(card => mapRemoteCard(card, membership.teamId, localBoard))
    })

    return {
      columns: localBoard.columns ?? [],
      cards: [...localCards, ...remoteCards],
    }
  }, [localBoard, localTasks, collabEnabled, memberships, runtimeTeams, semId])
}
