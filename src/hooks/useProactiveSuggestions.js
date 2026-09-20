import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { send as sendToModel } from '@/lib/ai/aiClient'
import { loadAiKey, loadBaseUrl } from '@/lib/ai/keys'
import { loadBudgetState, saveBudgetState, recordAiRequest } from '@/lib/ai/budget'
import { runProactiveSuggestion } from '@/lib/ai/runLoop'
import { installProactiveWatcher, setProactiveHeuristicListener } from '@/lib/ai/proactiveWatcher'
import { appOpenedOverdueTasks } from '@/lib/ai/proactiveHeuristics'
import { nanoid } from '@/lib/ids'

export const SUGGESTION_DEBOUNCE_MS = 4000

function resolveCredentials(providerId) {
  return { apiKey: loadAiKey(providerId), baseUrl: loadBaseUrl(providerId) }
}

function recordProactiveBudget(requests) {
  let state = loadBudgetState()
  for (const request of requests ?? []) {
    state = recordAiRequest(state, {
      slotName: request.slot,
      model: request.model,
      requestCount: 1,
      inputTokens: request.usage?.inputTokens,
      outputTokens: request.usage?.outputTokens,
    })
  }
  saveBudgetState(state)
}

export function useProactiveSuggestions() {
  const proactiveEnabled = useStore(s => s.settings?.apps?.aiAssistant === true && s.settings?.apps?.ai?.proactiveMode === true)
  const setProactiveSuggestion = useStore(s => s.setProactiveSuggestion)
  const timerRef = useRef(null)
  const pendingHeuristicRef = useRef(null)

  useEffect(() => {
    installProactiveWatcher()
  }, [])

  useEffect(() => {
    if (!proactiveEnabled) {
      setProactiveHeuristicListener(null)
      clearTimeout(timerRef.current)
      return
    }

    const scheduleEvaluation = heuristic => {
      pendingHeuristicRef.current = heuristic
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(runEvaluation, SUGGESTION_DEBOUNCE_MS)
    }

    setProactiveHeuristicListener(scheduleEvaluation)

    const appOpenHeuristic = appOpenedOverdueTasks(useStore.getState().tasks)
    if (appOpenHeuristic) scheduleEvaluation(appOpenHeuristic)

    async function runEvaluation() {
      const heuristic = pendingHeuristicRef.current
      pendingHeuristicRef.current = null
      if (!heuristic) return

      const state = useStore.getState()
      const aiSettings = state.settings?.apps?.ai ?? {}

      const outcome = await runProactiveSuggestion({
        send: sendToModel,
        resolveCredentials,
        store: state,
        scope: null,
        heuristic,
        optimizeFor: aiSettings.optimizeFor ?? 'requests',
        slots: aiSettings.slots ?? {},
        context: { budgetState: loadBudgetState() },
      })

      recordProactiveBudget(outcome.requests)

      if (!outcome.ok || !outcome.suggestion) return

      useStore.getState().setProactiveSuggestion({
        id: nanoid(),
        text: outcome.suggestion,
        heuristicKind: heuristic.kind,
        at: Date.now(),
      })
    }

    return () => {
      setProactiveHeuristicListener(null)
      clearTimeout(timerRef.current)
    }
  }, [proactiveEnabled, setProactiveSuggestion])
}
