import { useState } from 'react'
import { readJson, writeJson } from '@/lib/safeStorage'
import { pushHistory } from '@/lib/quickAction/history'

const HISTORY_KEY = 'organizer:quickActionHistory'
const HISTORY_LIMIT = 30

export function useQuickActionHistory() {
  const [history, setHistory] = useState(() => {
    const stored = readJson(HISTORY_KEY, [])
    return Array.isArray(stored) ? stored : []
  })

  const remember = command => {
    const next = pushHistory(history, command, HISTORY_LIMIT)
    setHistory(next)
    writeJson(HISTORY_KEY, next)
  }

  return { history, remember }
}
