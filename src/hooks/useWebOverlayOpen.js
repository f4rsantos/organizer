import { useEffect, useState } from 'react'

const COVERING_OVERLAY_SELECTOR = '[data-slot="dialog-content"], [role="alertdialog"], [data-native-chrome-cover]'

export function useWebOverlayOpen(enabled) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return
    let frame = 0
    const check = () => {
      frame = 0
      setOpen(document.querySelector(COVERING_OVERLAY_SELECTOR) !== null)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
    check()
    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [enabled])

  return enabled && open
}
