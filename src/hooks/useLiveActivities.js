import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { buildLiveActivitiesPayload } from '@/lib/widgets/liveActivities'
import { buildWidgetLabels } from '@/lib/widgets/projection'
import { getProviderEvents } from '@/lib/widgets/extraEvents'
import { liveActivitiesAvailable, syncLiveActivities } from '@/lib/widgets/bridge'
import { useWidgetsAvailable } from '@/hooks/useWidgetsAvailable'

const TICK_MS = 60 * 1000

export function useLiveActivities() {
  const widgetsReady = useWidgetsAvailable()
  const available = widgetsReady && liveActivitiesAvailable()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const settings = useStore(s => s.settings)
  const lang = useStore(s => s.lang ?? 'en')
  const tasks = useStore(s => s.tasks)
  const events = useStore(s => s.events)
  const focusSync = useStore(s => s.focusSync)
  const agentRuntime = useStore(s => s.agentRuntime)
  const currentTab = useStore(s => s.currentTab)

  useEffect(() => {
    if (!available) return
    const id = setInterval(() => setNowMs(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [available])

  const labels = buildWidgetLabels(lang)
  const state = { settings, tasks, events, focusSync, agentRuntime, currentTab, widgetExtraEvents: getProviderEvents() }
  const payload = JSON.stringify(buildLiveActivitiesPayload(state, nowMs, labels))

  useEffect(() => {
    if (!available) return
    syncLiveActivities(JSON.parse(payload))
  }, [available, payload])
}
