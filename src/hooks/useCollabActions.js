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

export function useCollabActions() {
  const userId = useStore(s => s.collab?.userId)
  const semesters = useStore(s => s.semesters ?? [])
  const classes = useStore(s => s.classes ?? [])
  const memberships = useStore(s => s.collab?.memberships ?? [])
  const runtimeTeams = useStore(s => s.collabRuntime?.teams ?? {})
  const setCollabRuntimeTeam = useStore(s => s.setCollabRuntimeTeam)
  const updateTask = useStore(s => s.updateTask)

  const teams = useMemo(() => memberships.map(m => {
    const runtime = runtimeTeams[m.teamId]
    return {
      ...m,
      runtime,
      name: runtime?.name ?? m.teamName ?? 'Team',
    }
  }), [memberships, runtimeTeams])

  const getMembership = teamId => memberships.find(m => m.teamId === teamId)
  const getTeam = teamId => runtimeTeams[teamId]

  const getTeamName = teamId => {
    const runtime = runtimeTeams[teamId]
    if (runtime?.name) return runtime.name
    const membership = memberships.find(m => m.teamId === teamId)
    return membership?.teamName ?? null
  }

  const getSharedTaskMode = team => team?.sharedTaskCompletionMode === 'personal' ? 'personal' : 'for-all'

  const ensureCanEdit = team => {
    if (!team) return false
    if (team.hostUserId === userId) return true
    return team.membersCanEditShared !== false
  }

  const applyRuntimeTeamState = (teamId, updater) => {
    const runtime = runtimeTeams[teamId]
    if (!runtime) return
    const nextState = updater(runtime.state ?? { tasks: [], kanban: { columns: [], cards: [] } })
    setCollabRuntimeTeam(teamId, {
      ...runtime,
      state: nextState,
    })
  }

  const shareTaskToTeam = async ({ task, teamId, localBoard }) => {
    const membership = getMembership(teamId)
    const team = runtimeTeams[teamId]
    if (!membership || !team || !userId) return
    if (!ensureCanEdit(team)) return

    const sharedTaskId = nanoid()
    const taskSemester = semesters.find(semester => semester.id === task.semesterId)
    const canEncodeWeekDates = !task?.dueDate && Boolean(taskSemester?.startDate)
    const weekStart = Number.isFinite(task?.weekStart) ? task.weekStart : 1
    const weekEndRaw = Number.isFinite(task?.weekEnd) ? task.weekEnd : weekStart
    const weekEnd = Math.max(weekStart, weekEndRaw)
    const className = classes.find(cls => cls.id === task?.classId)?.name ?? null
    const remoteTask = {
      ...task,
      id: sharedTaskId,
      className,
      sharedWeekStartDate: canEncodeWeekDates
        ? mondayDateForWeek(taskSemester.startDate, weekStart)
        : null,
      sharedWeekEndDate: canEncodeWeekDates
        ? mondayDateForWeek(taskSemester.startDate, weekEnd)
        : null,
      doneBy: {},
      doneForAll: !!task.done,
      sharedByUserId: userId,
      updatedAt: Date.now(),
    }

    const targetColumnId = resolveTargetColumn(localBoard)

    await updateTeamState({
      config: { apiKey: membership.apiKey, projectId: membership.projectId },
      teamId,
      userId,
      updater: state => {
        const tasks = [...(state?.tasks ?? []), remoteTask]
        return {
          ...state,
          tasks,
          kanban: state?.kanban ?? { columns: [], cards: [] },
        }
      },
    })

    updateTask(task.id, {
      sharedRef: {
        teamId,
        sharedTaskId,
      },
      sharedInKanbanColumnId: targetColumnId,
    })
  }

  const updateSharedTask = async ({ teamId, sharedTaskId, patch }) => {
    const membership = getMembership(teamId)
    const team = runtimeTeams[teamId]
    if (!membership || !team || !userId) return
    if (!ensureCanEdit(team)) return

    await updateTeamState({
      config: { apiKey: membership.apiKey, projectId: membership.projectId },
      teamId,
      userId,
      updater: state => ({
        ...state,
        tasks: (state?.tasks ?? []).map(task => {
          if (task.id !== sharedTaskId) return task

          const nextTask = { ...task, ...patch }
          const patchSemester = semesters.find(semester => semester.id === nextTask?.semesterId)
          const hasDueDate = Boolean(nextTask?.dueDate)
          if (hasDueDate) {
            nextTask.sharedWeekStartDate = null
            nextTask.sharedWeekEndDate = null
          } else if (patchSemester?.startDate) {
            const weekStart = Number.isFinite(nextTask?.weekStart) ? nextTask.weekStart : 1
            const weekEndRaw = Number.isFinite(nextTask?.weekEnd) ? nextTask.weekEnd : weekStart
            const weekEnd = Math.max(weekStart, weekEndRaw)
            nextTask.sharedWeekStartDate = mondayDateForWeek(patchSemester.startDate, weekStart)
            nextTask.sharedWeekEndDate = mondayDateForWeek(patchSemester.startDate, weekEnd)
          }

          return { ...nextTask, updatedAt: Date.now() }
        }),
      }),
    })
  }

  const toggleSharedTask = async ({ teamId, sharedTaskId }) => {
    const membership = getMembership(teamId)
    const team = getTeam(teamId)
    if (!membership || !team || !userId) return

    const mode = getSharedTaskMode(team)

    await updateTeamState({
      config: { apiKey: membership.apiKey, projectId: membership.projectId },
      teamId,
      userId,
      updater: state => ({
        ...state,
        tasks: (state?.tasks ?? []).map(task => {
          if (task.id !== sharedTaskId) return task
          if (mode === 'for-all') {
            if (!ensureCanEdit(team)) return task
            return { ...task, doneForAll: !task.doneForAll, updatedAt: Date.now() }
          }
          const doneBy = { ...(task.doneBy ?? {}) }
          doneBy[userId] = !doneBy[userId]
          return { ...task, doneBy, updatedAt: Date.now() }
        }),
      }),
    })
  }

  const deleteSharedTask = async ({ teamId, sharedTaskId }) => {
    const membership = getMembership(teamId)
    const team = runtimeTeams[teamId]
    if (!membership || !team || !userId) return
    if (!ensureCanEdit(team)) return

    await updateTeamState({
      config: { apiKey: membership.apiKey, projectId: membership.projectId },
      teamId,
      userId,
      updater: state => ({
        ...state,
        tasks: (state?.tasks ?? []).filter(task => task.id !== sharedTaskId),
        kanban: {
          ...(state?.kanban ?? { columns: [], cards: [] }),
          cards: (state?.kanban?.cards ?? []).filter(card => card.sharedTaskId !== sharedTaskId),
        },
      }),
    })
  }

  const moveSharedCard = async ({ teamId, sharedCardId, targetColumnId }) => {
    const membership = getMembership(teamId)
    const team = runtimeTeams[teamId]
    if (!membership || !team || !userId) return
    if (!ensureCanEdit(team)) return

    await updateTeamState({
      config: { apiKey: membership.apiKey, projectId: membership.projectId },
      teamId,
      userId,
      updater: state => ({
        ...state,
        kanban: {
          ...(state?.kanban ?? { columns: [], cards: [] }),
          cards: (state?.kanban?.cards ?? []).map(card => card.id === sharedCardId
            ? { ...card, columnId: targetColumnId, updatedAt: Date.now() }
            : card),
        },
      }),
    })

    applyRuntimeTeamState(teamId, state => ({
      ...state,
      kanban: {
        ...(state?.kanban ?? { columns: [], cards: [] }),
        cards: (state?.kanban?.cards ?? []).map(card => card.id === sharedCardId
          ? { ...card, columnId: targetColumnId, updatedAt: Date.now() }
          : card),
      },
    }))
  }

  const updateSharedCard = async ({ teamId, sharedCardId, patch }) => {
    const membership = getMembership(teamId)
    const team = runtimeTeams[teamId]
    if (!membership || !team || !userId) return
    if (!ensureCanEdit(team)) return

    await updateTeamState({
      config: { apiKey: membership.apiKey, projectId: membership.projectId },
      teamId,
      userId,
      updater: state => ({
        ...state,
        kanban: {
          ...(state?.kanban ?? { columns: [], cards: [] }),
          cards: (state?.kanban?.cards ?? []).map(card => card.id === sharedCardId
            ? { ...card, ...patch, updatedAt: Date.now() }
            : card),
        },
      }),
    })

    applyRuntimeTeamState(teamId, state => ({
      ...state,
      kanban: {
        ...(state?.kanban ?? { columns: [], cards: [] }),
        cards: (state?.kanban?.cards ?? []).map(card => card.id === sharedCardId
          ? { ...card, ...patch, updatedAt: Date.now() }
          : card),
      },
    }))
  }

  const deleteSharedCard = async ({ teamId, sharedCardId }) => {
    const membership = getMembership(teamId)
    const team = runtimeTeams[teamId]
    if (!membership || !team || !userId) return
    if (!ensureCanEdit(team)) return

    await updateTeamState({
      config: { apiKey: membership.apiKey, projectId: membership.projectId },
      teamId,
      userId,
      updater: state => ({
        ...state,
        kanban: {
          ...(state?.kanban ?? { columns: [], cards: [] }),
          cards: (state?.kanban?.cards ?? []).filter(card => card.id !== sharedCardId),
        },
      }),
    })

    applyRuntimeTeamState(teamId, state => ({
      ...state,
      kanban: {
        ...(state?.kanban ?? { columns: [], cards: [] }),
        cards: (state?.kanban?.cards ?? []).filter(card => card.id !== sharedCardId),
      },
    }))
  }

  const shareKanbanCardToTeam = async ({ card, teamId, semId, localBoard }) => {
    const membership = getMembership(teamId)
    const team = runtimeTeams[teamId]
    if (!membership || !team || !userId) return
    if (!ensureCanEdit(team)) return

    const sharedCardId = nanoid()
    const cardColumnId = resolveTargetColumn(localBoard, card.columnId)

    await updateTeamState({
      config: { apiKey: membership.apiKey, projectId: membership.projectId },
      teamId,
      userId,
      updater: state => ({
        ...state,
        kanban: {
          ...(state?.kanban ?? { columns: [], cards: [] }),
          cards: [
            ...(state?.kanban?.cards ?? []),
            {
              ...card,
              id: sharedCardId,
              semesterId: semId,
              columnId: cardColumnId,
              sharedByUserId: userId,
              updatedAt: Date.now(),
            },
          ],
        },
      }),
    })

    applyRuntimeTeamState(teamId, state => ({
      ...state,
      kanban: {
        ...(state?.kanban ?? { columns: [], cards: [] }),
        cards: [
          ...(state?.kanban?.cards ?? []),
          {
            ...card,
            id: sharedCardId,
            semesterId: semId,
            columnId: cardColumnId,
            sharedByUserId: userId,
            updatedAt: Date.now(),
          },
        ],
      },
    }))
  }

  const addSharedTaskToKanbanForTeam = async ({ teamId, sharedTaskId, semId, columnId, classId = null, className = null }) => {
    const membership = getMembership(teamId)
    const team = getTeam(teamId)
    if (!membership || !team || !userId) return
    if (!ensureCanEdit(team)) return

    await updateTeamState({
      config: { apiKey: membership.apiKey, projectId: membership.projectId },
      teamId,
      userId,
      updater: state => {
        const cards = state?.kanban?.cards ?? []
        const already = cards.some(card => card.sharedTaskId === sharedTaskId && card.semesterId === semId)
        if (already) return state
        const sharedTask = (state?.tasks ?? []).find(task => task.id === sharedTaskId)

        const nextCards = [
          ...cards,
          {
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
          },
        ]

        return {
          ...state,
          kanban: {
            ...(state?.kanban ?? { columns: [], cards: [] }),
            cards: nextCards,
          },
        }
      },
    })

    applyRuntimeTeamState(teamId, state => {
      const cards = state?.kanban?.cards ?? []
      const already = cards.some(card => card.sharedTaskId === sharedTaskId && card.semesterId === semId)
      if (already) return state
      const sharedTask = (state?.tasks ?? []).find(task => task.id === sharedTaskId)

      const nextCards = [
        ...cards,
        {
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
        },
      ]

      return {
        ...state,
        kanban: {
          ...(state?.kanban ?? { columns: [], cards: [] }),
          cards: nextCards,
        },
      }
    })
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
