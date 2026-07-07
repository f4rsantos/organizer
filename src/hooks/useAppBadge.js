import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { updateBadge } from '@/lib/appBadge'

export function useAppBadge() {
  const tasks = useStore(s => s.tasks)
  const noneMode = useStore(s => s.settings?.semesterMode === 'none')
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const scopeId = noneMode ? null : activeSemesterId

  useEffect(() => {
    const pending = tasks.filter(t => t.views?.list !== false && !t.done && t.semesterId === scopeId).length
    updateBadge(pending)
  }, [tasks, scopeId])
}
