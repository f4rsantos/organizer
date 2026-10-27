import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { isNativePlatform } from '@/lib/platform'

const BREAK_WINDOW_NAME = 'organizer-break'

const isBreak = state => state.focusSync?.phase === 'break'

function openBreakWindow(url) {
  if (isNativePlatform()) {
    window.open(url, '_blank')
    return null
  }
  const win = window.open('', BREAK_WINDOW_NAME)
  if (!win) return null
  win.opener = null
  win.location.href = url
  return win
}

export function useBreakLink(url, onBreak) {
  const windowRef = useRef(null)
  const [blocked, setBlocked] = useState(false)

  const openLink = useCallback(() => {
    if (!url) return
    windowRef.current = openBreakWindow(url)
    setBlocked(!windowRef.current && !isNativePlatform())
  }, [url])

  useEffect(() => useStore.subscribe((state, prev) => {
    if (isBreak(state) === isBreak(prev)) return
    if (isBreak(state)) {
      openLink()
      return
    }
    windowRef.current?.close()
    windowRef.current = null
    setBlocked(false)
  }), [openLink])

  return { blocked: onBreak && blocked, openLink }
}
