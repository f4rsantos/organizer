import { useMemo } from 'react'
import { addWeeks, format, parseISO, startOfWeek } from 'date-fns'
import { nanoid } from '@/lib/ids'
import { useStore } from '@/store/useStore'
import { updateTeamState, updateMemberAlias as firebaseUpdateMemberAlias } from '@/lib/collab/firebase'
import { classifyCollabError } from '@/lib/collab/errors'
import { sortByOrder } from '@/lib/utils'
import { resolveTeamUserId } from '@/hooks/useTeamIdentity'

function resolveTargetColumn(localBoard, desiredColumnId = null) {
  const columns = sortByOrder(localBoard?.columns ?? [])
  if (!columns.length) return 'col_todo'
  if (desiredColumnId && columns.some(c => c.id === desiredColumnId)) return desiredColumnId
  const todo = columns.find(col => col.id.toLowerCase().includes('todo') || col.title.toLowerCase().includes('to do') || col.title.toLowerCase().includes('todo'))
  return todo?.id ?? columns[0]?.id ?? 'col_todo'
}

function mondayDateForWeek(semesterStartDate, week) {
  if (!semesterStartDate || !Number.isFinite(week)) return null
  const start = parseISO(semesterStartDate)
  if (Number.isNaN(start.getTime())) return null
  const monday = addWeeks(startOfWeek(start, { weekStartsOn: 1 }), week - 1)
  return format(monday, 'yyyy-MM-dd')
}

function patchWeekDates(task, semesters) {
  const semester = semesters.find(s => s.id === task?.semesterId)
  if (!semester?.startDate) return {}
  if (task?.dueDate) return { sharedWeekStartDate: null, sharedWeekEndDate: null }
  const weekStart = Number.isFinite(task?.weekStart) ? task.weekStart : 1
  const weekEnd = Math.max(weekStart, Number.isFinite(task?.weekEnd) ? task.weekEnd : weekStart)
  return {
    sharedWeekStartDate: mondayDateForWeek(semester.startDate, weekStart),
    sharedWeekEndDate: mondayDateForWeek(semester.startDate, weekEnd),
  }
}

export function useCollabActions() {
  const userId = useStore(s => s.collab?.userId)
  const semesters = useStore(s => s.semesters ?? [])
  const classes = useStore(s => s.classes ?? [])
  const memberships = useStore(s => s.collab?.memberships ?? [])
  const runtimeTeams = useStore(s => s.collabRuntime?.teams ?? {})
  const setCollabRuntimeTeam = useStore(s => s.setCollabRuntimeTeam)
  const setCollabError = useStore(s => s.setCollabError)
  const updateTask = useStore(s => s.updateTask)
  const updateKanbanCard = useStore(s => s.updateKanbanCard)
  const clearKanbanCardSharedRef = useStore(s => s.clearKanbanCardSharedRef)

  const teams = useMemo(() => memberships.map(m => {
    const runtime = runtimeTeams[m.teamId]
    return { ...m, runtime, name: runtime?.name ?? m.teamName ?? 'Team' }
  }), [memberships, runtimeTeams])

  const getMembership = teamId => memberships.find(m => m.teamId === teamId)
  const getTeam = teamId => runtimeTeams[teamId]

  const getTeamName = teamId => {
    const runtime = runtimeTeams[teamId]
    if (runtime?.name) return runtime.name
    return memberships.find(m => m.teamId === teamId)?.teamName ?? null
  }

  const getSharedTaskMode = team => team?.sharedTaskCompletionMode === 'personal' ? 'personal' : 'for-all'

  const teamUserId = teamId => resolveTeamUserId(userId, teamId)

  const ensureCanEdit = (team, teamId) => {
    if (!team) return false
    if (team.hostPersonId === teamUserId(teamId)) return true
    return team.membersCanEditShared !== false
  }

  const firebaseConfig = membership => ({ apiKey: membership.apiKey, projectId: membership.projectId })

  const optimistic = (teamId, updater) => {
    const runtime = runtimeTeams[teamId]
    if (!runtime) return
    const nextState = updater(runtime.state ?? { tasks: [], kanban: { columns: [], cards: [] } })
    setCollabRuntimeTeam(teamId, { ...runtime, state: nextState })
  }

  const guard = (teamId, requireEdit = true) => {
    const membership = getMembership(teamId)
    const team = getTeam(teamId)
    if (!membership || !team || !userId) return null
    if (team.syncStatus === 'device-unlinked') return null
    if (requireEdit && !ensureCanEdit(team, teamId)) return null
    return { membership, team }
  }

  const writeShared = async (teamId, membership, applyOptimistic, updater, onRollback) => {
    const snapshot = useStore.getState().collabRuntime?.teams?.[teamId]
    optimistic(teamId, applyOptimistic)
    try {
      await updateTeamState({
        config: firebaseConfig(membership), teamId, teamKey: membership.teamKey, updater,
      })
    } catch (err) {
      if (snapshot) setCollabRuntimeTeam(teamId, snapshot)
      if (typeof onRollback === 'function') onRollback()
      setCollabError(teamId, err?.message ?? 'Sync failed', classifyCollabError(err))
    }
  }

  const shareTaskToTeam = async ({ task, teamId, localBoard }) => {
    const me = teamUserId(teamId)
    const ctx = guard(teamId)
    if (!ctx) return
    const { membership } = ctx

    const sharedTaskId = nanoid()
    const taskSemester = semesters.find(s => s.id === task.semesterId)
    const canEncodeWeekDates = !task?.dueDate && Boolean(taskSemester?.startDate)
    const weekStart = Number.isFinite(task?.weekStart) ? task.weekStart : 1
    const weekEnd = Math.max(weekStart, Number.isFinite(task?.weekEnd) ? task.weekEnd : weekStart)
    const className = classes.find(cls => cls.id === task?.classId)?.name ?? null

    const remoteTask = {
      ...task,
      id: sharedTaskId,
      className,
      sharedWeekStartDate: canEncodeWeekDates ? mondayDateForWeek(taskSemester.startDate, weekStart) : null,
      sharedWeekEndDate: canEncodeWeekDates ? mondayDateForWeek(taskSemester.startDate, weekEnd) : null,
      doneBy: {},
      doneForAll: !!task.done,
      sharedByUserId: me,
      updatedAt: Date.now(),
    }

    const targetColumnId = resolveTargetColumn(localBoard)
    const addTaskState = state => ({ ...state, tasks: [...(state?.tasks ?? []), remoteTask] })

    updateTask(task.id, { sharedRef: { teamId, sharedTaskId }, sharedInKanbanColumnId: targetColumnId })

    await writeShared(teamId, membership, addTaskState, addTaskState, () => {
      updateTask(task.id, { sharedRef: null, sharedInKanbanColumnId: null })
    })
  }

  const updateSharedTask = async ({ teamId, sharedTaskId, patch }) => {
    const ctx = guard(teamId)
    if (!ctx) return
    const { membership } = ctx

    const applyPatch = state => ({
      ...state,
      tasks: (state?.tasks ?? []).map(task => {
        if (task.id !== sharedTaskId) return task
        const next = { ...task, ...patch }
        return { ...next, ...patchWeekDates(next, semesters), updatedAt: Date.now() }
      }),
    })

    await writeShared(teamId, membership, applyPatch, applyPatch)
  }

  const toggleSharedTask = async ({ teamId, sharedTaskId }) => {
    const team = getTeam(teamId)
    const me = teamUserId(teamId)
    const mode = getSharedTaskMode(team)
    if (team?.assignedOnlyComplete) {
      const target = (team.state?.tasks ?? []).find(t => t.id === sharedTaskId)
      if (target?.assigneeUserId && target.assigneeUserId !== me) return
    }
    const ctx = guard(teamId, mode === 'for-all')
    if (!ctx) return
    const { membership } = ctx

    const applyToggle = state => ({
      ...state,
      tasks: (state?.tasks ?? []).map(task => {
        if (task.id !== sharedTaskId) return task
        if (mode === 'for-all') {
          return { ...task, doneForAll: !task.doneForAll, updatedAt: Date.now() }
        }
        const doneBy = { ...(task.doneBy ?? {}), [me]: !task.doneBy?.[me] }
        return { ...task, doneBy, updatedAt: Date.now() }
      }),
    })

    await writeShared(teamId, membership, applyToggle, applyToggle)
  }

  const deleteSharedTask = async ({ teamId, sharedTaskId }) => {
    const ctx = guard(teamId)
    if (!ctx) return
    const { membership } = ctx

    const applyDelete = state => ({
      ...state,
      tasks: (state?.tasks ?? []).filter(task => task.id !== sharedTaskId),
      kanban: {
        ...(state?.kanban ?? { columns: [], cards: [] }),
        cards: (state?.kanban?.cards ?? []).filter(card => card.sharedTaskId !== sharedTaskId),
      },
    })

    await writeShared(teamId, membership, applyDelete, applyDelete)
  }

  const moveSharedCard = async ({ teamId, sharedCardId, targetColumnId }) => {
    const ctx = guard(teamId)
    if (!ctx) return
    const { membership } = ctx

    const applyMove = state => {
      const columns = sortByOrder(state?.kanban?.columns ?? [])
      const doneColumnId = columns[columns.length - 1]?.id ?? null
      const done = doneColumnId == null ? undefined : targetColumnId === doneColumnId
      return {
        ...state,
        kanban: {
          ...(state?.kanban ?? { columns: [], cards: [] }),
          cards: (state?.kanban?.cards ?? []).map(card =>
            card.id === sharedCardId
              ? { ...card, columnId: targetColumnId, ...(done !== undefined && { done }), updatedAt: Date.now() }
              : card
          ),
        },
      }
    }

    await writeShared(teamId, membership, applyMove, applyMove)
  }

  const reorderSharedCards = async ({ teamId, columnId, orderedSharedIds }) => {
    const ctx = guard(teamId)
    if (!ctx) return
    const { membership } = ctx

    const position = new Map(orderedSharedIds.map((id, i) => [id, i]))
    const applyReorder = state => ({
      ...state,
      kanban: {
        ...(state?.kanban ?? { columns: [], cards: [] }),
        cards: (state?.kanban?.cards ?? []).map(card =>
          position.has(card.id)
            ? { ...card, columnId, order: position.get(card.id), updatedAt: Date.now() }
            : card
        ),
      },
    })

    await writeShared(teamId, membership, applyReorder, applyReorder)
  }

  const updateSharedCard = async ({ teamId, sharedCardId, patch }) => {
    const team = getTeam(teamId)
    const me = teamUserId(teamId)
    if (patch?.done === true && team?.assignedOnlyComplete) {
      const target = (team?.state?.kanban?.cards ?? []).find(c => c.id === sharedCardId)
      if (target?.assigneeUserId && target.assigneeUserId !== me) return
    }
    const ctx = guard(teamId)
    if (!ctx) return
    const { membership } = ctx

    const { id: _id, sharedMeta: _sm, sharedRef: _sr, ...cleanPatch } = patch ?? {}

    const applyUpdate = state => ({
      ...state,
      kanban: {
        ...(state?.kanban ?? { columns: [], cards: [] }),
        cards: (state?.kanban?.cards ?? []).map(card =>
          card.id === sharedCardId ? { ...card, ...cleanPatch, updatedAt: Date.now() } : card
        ),
      },
    })

    await writeShared(teamId, membership, applyUpdate, applyUpdate)
  }

  const deleteSharedCard = async ({ teamId, sharedCardId }) => {
    const ctx = guard(teamId)
    if (!ctx) return
    const { membership } = ctx

    const applyDelete = state => ({
      ...state,
      kanban: {
        ...(state?.kanban ?? { columns: [], cards: [] }),
        cards: (state?.kanban?.cards ?? []).filter(card => card.id !== sharedCardId),
      },
    })

    clearKanbanCardSharedRef(sharedCardId)
    await writeShared(teamId, membership, applyDelete, applyDelete)
  }

  const shareKanbanCardToTeam = async ({ card, teamId, semId, localBoard }) => {
    const me = teamUserId(teamId)
    const ctx = guard(teamId)
    if (!ctx) return
    const { membership } = ctx

    const sharedCardId = nanoid()
    const cardColumnId = resolveTargetColumn(localBoard, card.columnId)
    const remoteCard = {
      ...card,
      id: sharedCardId,
      semesterId: null,
      columnId: cardColumnId,
      sharedByUserId: me,
      updatedAt: Date.now(),
    }

    const addCardState = state => ({
      ...state,
      kanban: {
        ...(state?.kanban ?? { columns: [], cards: [] }),
        cards: [...(state?.kanban?.cards ?? []), remoteCard],
      },
    })

    updateKanbanCard(semId, card.id, { sharedRef: { teamId, sharedCardId } })

    await writeShared(teamId, membership, addCardState, addCardState, () => {
      updateKanbanCard(semId, card.id, { sharedRef: null })
    })
  }

  const addSharedTaskToKanbanForTeam = async ({ teamId, sharedTaskId, columnId, classId = null, className = null }) => {
    const me = teamUserId(teamId)
    const ctx = guard(teamId)
    if (!ctx) return
    const { membership } = ctx

    const buildCard = state => {
      const cards = state?.kanban?.cards ?? []
      if (cards.some(card => card.sharedTaskId === sharedTaskId)) return null
      const sharedTask = (state?.tasks ?? []).find(task => task.id === sharedTaskId)
      return {
        id: nanoid(),
        title: sharedTask?.title ?? 'Task',
        semesterId: null,
        columnId,
        checklist: [],
        classId: classId ?? sharedTask?.classId ?? null,
        className: className ?? sharedTask?.className ?? null,
        sharedTaskId,
        sharedByUserId: me,
        updatedAt: Date.now(),
      }
    }

    const applyAdd = state => {
      const card = buildCard(state)
      if (!card) return state
      return {
        ...state,
        kanban: {
          ...(state?.kanban ?? { columns: [], cards: [] }),
          cards: [...(state?.kanban?.cards ?? []), card],
        },
      }
    }

    await writeShared(teamId, membership, applyAdd, applyAdd)
  }

  const updateAlias = async (teamId, alias) => {
    if (!userId) return
    const membership = getMembership(teamId)
    if (!membership) return
    try {
      await firebaseUpdateMemberAlias({
        config: firebaseConfig(membership),
        teamId,
        alias,
      })
    } catch (err) {
      setCollabError(teamId, err?.message ?? 'Failed to update alias', classifyCollabError(err))
    }
  }

  return {
    teams,
    getTeamName,
    shareTaskToTeam,
    updateSharedTask,
    toggleSharedTask,
    deleteSharedTask,
    shareKanbanCardToTeam,
    addSharedTaskToKanbanForTeam,
    moveSharedCard,
    reorderSharedCards,
    updateSharedCard,
    deleteSharedCard,
    updateAlias,
  }
}
