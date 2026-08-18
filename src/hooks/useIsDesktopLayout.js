import { useEffect, useState } from 'react'

const QUERY = '(min-width: 768px)'

function matches() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(QUERY).matches
}

export function useIsDesktopLayout() {
  const [desktop, setDesktop] = useState(matches)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(QUERY)
    const onChange = () => setDesktop(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return desktop
}
