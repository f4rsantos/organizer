import { useLayoutEffect, useRef, useState } from 'react'

export function useMeasuredWidth(minWidth = 220, initialWidth = 320) {
  const ref = useRef(null)
  const [width, setWidth] = useState(initialWidth)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return

    const update = () => setWidth(Math.max(minWidth, Math.floor(node.clientWidth || 0)))
    update()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }

    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [minWidth])

  return [ref, width]
}
