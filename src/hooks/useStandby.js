import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'

function isStandbyViewport() {
  if (typeof window === 'undefined') return false
  const landscape = window.matchMedia('(orientation: landscape)').matches
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const shortSide = Math.min(window.innerWidth, window.innerHeight)
  return landscape && coarse && shortSide <= 600
}

export function useStandby() {
  const enabled = useStore(s => s.settings?.standby?.enabled ?? false)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const update = () => setActive(enabled && isStandbyViewport())
    update()
    if (!enabled) return
    const mq = window.matchMedia('(orientation: landscape)')
    mq.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => {
      mq.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [enabled])

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock = null
    let released = false
    navigator.wakeLock.request('screen').then(l => { if (released) l.release(); else lock = l }).catch(() => {})
    return () => { released = true; lock?.release?.().catch(() => {}) }
  }, [active])

  return active
}
