import { useStore } from '@/store/useStore'
import { evaluateProactiveHeuristic, PROACTIVE_TRIGGER_ACTIONS } from '@/lib/ai/proactiveHeuristics'

let installed = false
let listener = null

export function setProactiveHeuristicListener(fn) {
  listener = fn
}

function wrapAction(actionName) {
  const original = useStore.getState()[actionName]
  if (typeof original !== 'function') return

  useStore.setState({
    [actionName]: (...args) => {
      const prevState = useStore.getState()
      const returnValue = original(...args)
      const nextState = useStore.getState()
      if (listener) {
        const heuristic = evaluateProactiveHeuristic(actionName, { args, prevState, nextState })
        if (heuristic) listener(heuristic)
      }
      return returnValue
    },
  })
}

export function installProactiveWatcher() {
  if (installed) return
  installed = true
  for (const actionName of PROACTIVE_TRIGGER_ACTIONS) {
    wrapAction(actionName)
  }
}

export function resetProactiveWatcherForTests() {
  installed = false
  listener = null
}
