import { useCallback, useSyncExternalStore } from 'react'
import { applyTextDiff } from '@/lib/collab/yText'

export function useSharedNoteTitle(titleSource, storedTitle) {
  const subscribe = useCallback(onChange => {
    if (!titleSource) return () => {}
    titleSource.text.observe(onChange)
    titleSource.meta.observe(onChange)
    return () => {
      titleSource.text.unobserve(onChange)
      titleSource.meta.unobserve(onChange)
    }
  }, [titleSource])

  const snapshot = useCallback(() => {
    if (!titleSource || titleSource.meta.get('migrated') !== true) return null
    return titleSource.text.toString()
  }, [titleSource])

  const fragmentTitle = useSyncExternalStore(subscribe, snapshot, () => null)

  const onTitleChange = useCallback(next => {
    if (!titleSource) return
    titleSource.adopt(storedTitle)
    applyTextDiff(titleSource.text, next)
  }, [titleSource, storedTitle])

  return {
    title: fragmentTitle ?? storedTitle ?? '',
    onTitleChange,
  }
}
