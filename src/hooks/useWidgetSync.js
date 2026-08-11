import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { pushProjection, clearProjection, drainQueue } from '@/lib/widgets/bridge'
import { useWidgetsAvailable } from '@/hooks/useWidgetsAvailable'
import { replayOps } from '@/lib/widgets/mutations'
import { isEncryptionEnabled, getCachedDek, subscribeDek } from '@/lib/crypto'
import { getProviderEvents, subscribeProviderEvents } from '@/lib/widgets/extraEvents'

function readable() {
  return !isEncryptionEnabled() || getCachedDek() !== null
}

function stateForWidgets() {
  return { ...useStore.getState(), widgetExtraEvents: getProviderEvents() }
}

export function useWidgetSync() {
  const enabled = useStore(s => s.settings?.widgetsEnabled === true)
  const hydrated = useStore(s => s.hydrated)
  const tasks = useStore(s => s.tasks)
  const events = useStore(s => s.events)
  const kanban = useStore(s => s.kanban)
  const classes = useStore(s => s.classes)
  const goals = useStore(s => s.goals)
  const pomodoros = useStore(s => s.pomodoros)
  const focusSync = useStore(s => s.focusSync)
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const collabTeams = useStore(s => s.collabRuntime?.teams)
  const [extraTick, setExtraTick] = useState(0)
  const busy = useRef(false)

  const available = useWidgetsAvailable()
  const [unlocked, setUnlocked] = useState(() => readable())

  useEffect(() => subscribeDek(() => setUnlocked(readable())), [])

  useEffect(() => subscribeProviderEvents(() => setExtraTick(v => v + 1)), [])

  const active = hydrated && enabled && available && unlocked

  useEffect(() => {
    if (!available) return
    if (enabled && unlocked) return
    clearProjection()
  }, [hydrated, enabled, available, unlocked])

  useEffect(() => {
    if (!active) return
    pushProjection(stateForWidgets())
  }, [active, tasks, events, kanban, classes, goals, activeSemesterId, collabTeams, extraTick, pomodoros, focusSync])

  useEffect(() => {
    if (!active) return

    const sync = async () => {
      if (busy.current) return
      busy.current = true
      try {
        const ops = await drainQueue()
        if (ops.length > 0) {
          const { setTaskDone, moveKanbanCard, checkInGoal, undoGoalCheckIn, setFocusSync } = useStore.getState()
          replayOps(ops, { setTaskDone, moveKanbanCard, checkInGoal, undoGoalCheckIn, setFocusSync }, stateForWidgets)
        }
        await pushProjection(stateForWidgets())
      } finally {
        busy.current = false
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }

    sync()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [active])
}
