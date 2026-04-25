import { useMemo } from 'react'
import { addWeeks, format, parseISO, startOfWeek } from 'date-fns'
import { nanoid } from '@/lib/ids'
import { useStore } from '@/store/useStore'
import { updateTeamState } from '@/lib/collab/firebase'

function resolveTargetColumn(localBoard, desiredColumnId = null) {
  const columns = [...(localBoard?.columns ?? [])].sort((a, b) => a.order - b.order)
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

  const ensureCanEdit = team => {
    if (!team) return false
    if (team.hostUserId === userId) return true
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
    if (requireEdit && !ensureCanEdit(team)) return null
    return { membership, team }
  }

  const shareTaskToTeam = async ({ task, teamId, localBoard }) => {
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
      sharedByUserId: userId,
      updatedAt: Date.now(),
    }

    const targetColumnId = resolveTargetColumn(localBoard)

    optimistic(teamId, state => ({ ...state, tasks: [...(state?.tasks ?? []), remoteTask] }))
    updateTask(task.id, { sharedRef: { teamId, sharedTaskId }, sharedInKanbanColumnId: targetColumnId })

    await updateTeamState({
      config: firebaseConfig(membership),
      teamId,
      userId,
      updater: state => ({ ...state, tasks: [...(state?.tasks ?? []), remoteTask] }),
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

    optimistic(teamId, applyPatch)
    await updateTeamState({ config: firebaseConfig(membership), teamId, userId, updater: applyPatch })
  }

  const toggleSharedTask = async ({ teamId, sharedTaskId }) => {
    const membership = getMembership(teamId)
    const team = getTeam(teamId)
    if (!membership || !team || !userId) return

    const mode = getSharedTaskMode(team)

    const applyToggle = state => ({
      ...state,
      tasks: (state?.tasks ?? []).map(task => {
        if (task.id !== sharedTaskId) return task
        if (mode === 'for-all') {
          if (!ensureCanEdit(team)) return task
          return { ...task, doneForAll: !task.doneForAll, updatedAt: Date.now() }
        }
        const doneBy = { ...(task.doneBy ?? {}), [userId]: !task.doneBy?.[userId] }
        return { ...task, doneBy, updatedAt: Date.now() }
      }),
    })

    optimistic(teamId, applyToggle)
    await updateTeamState({ config: firebaseConfig(membership), teamId, userId, updater: applyToggle })
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

    optimistic(teamId, applyDelete)
    await updateTeamState({ config: firebaseConfig(membership), teamId, userId, updater: applyDelete })
  }

  const moveSharedCard = async ({ teamId, sharedCardId, targetColumnId }) => {
    const ctx = guard(teamId)
    if (!ctx) return
    const { membership } = ctx

    const applyMove = state => ({
      ...state,
      kanban: {
        ...(state?.kanban ?? { columns: [], cards: [] }),
        cards: (state?.kanban?.cards ?? []).map(card =>
          card.id === sharedCardId ? { ...card, columnId: targetColumnId, updatedAt: Date.now() } : card
        ),
      },
    })

    optimistic(teamId, applyMove)
    await updateTeamState({ config: firebaseConfig(membership), teamId, userId, updater: applyMove })
  }

  const updateSharedCard = async ({ teamId, sharedCardId, patch }) => {
    const ctx = guard(teamId)
    if (!ctx) return
    const { membership } = ctx

    const applyUpdate = state => ({
      ...state,
      kanban: {
        ...(state?.kanban ?? { columns: [], cards: [] }),
        cards: (state?.kanban?.cards ?? []).map(card =>
          card.id === sharedCardId ? { ...card, ...patch, updatedAt: Date.now() } : card
        ),
      },
    })

    optimistic(teamId, applyUpdate)
    await updateTeamState({ config: firebaseConfig(membership), teamId, userId, updater: applyUpdate })
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

    optimistic(teamId, applyDelete)
    clearKanbanCardSharedRef(sharedCardId)
    await updateTeamState({ config: firebaseConfig(membership), teamId, userId, updater: applyDelete })
  }

  const shareKanbanCardToTeam = async ({ card, teamId, semId, localBoard }) => {
    const ctx = guard(teamId)
    if (!ctx) return
    const { membership } = ctx

    const sharedCardId = nanoid()
    const cardColumnId = resolveTargetColumn(localBoard, card.columnId)
    const remoteCard = {
      ...card,
      id: sharedCardId,
      semesterId: semId,
      columnId: cardColumnId,
      sharedByUserId: userId,
      updatedAt: Date.now(),
    }

    optimistic(teamId, state => ({
      ...state,
      kanban: {
        ...(state?.kanban ?? { columns: [], cards: [] }),
        cards: [...(state?.kanban?.cards ?? []), remoteCard],
      },
    }))
    updateKanbanCard(semId, card.id, { sharedRef: { teamId, sharedCardId } })

    await updateTeamState({
      config: firebaseConfig(membership),
      teamId,
      userId,
      updater: state => ({
        ...state,
        kanban: {
          ...(state?.kanban ?? { columns: [], cards: [] }),
          cards: [...(state?.kanban?.cards ?? []), remoteCard],
        },
      }),
    })
  }

  const addSharedTaskToKanbanForTeam = async ({ teamId, sharedTaskId, semId, columnId, classId = null, className = null }) => {
    const ctx = guard(teamId)
    if (!ctx) return
    const { membership } = ctx

    const buildCard = state => {
      const cards = state?.kanban?.cards ?? []
      if (cards.some(card => card.sharedTaskId === sharedTaskId && card.semesterId === semId)) return null
      const sharedTask = (state?.tasks ?? []).find(task => task.id === sharedTaskId)
      return {
        id: nanoid(),
        title: sharedTask?.title ?? 'Task',
        semesterId: semId,
        columnId,
        checklist: [],
        classId: classId ?? sharedTask?.classId ?? null,
        className: className ?? sharedTask?.className ?? null,
        sharedTaskId,
        sharedByUserId: userId,
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

    optimistic(teamId, applyAdd)
    await updateTeamState({ config: firebaseConfig(membership), teamId, userId, updater: applyAdd })
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
    updateSharedCard,
    deleteSharedCard,
  }
}
