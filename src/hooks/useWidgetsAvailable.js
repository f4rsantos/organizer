import { useEffect, useState } from 'react'
import { widgetsAvailable } from '@/lib/widgets/bridge'

export function useWidgetsAvailable() {
  const [available, setAvailable] = useState(() => widgetsAvailable())

  useEffect(() => {
    if (available) return
    const id = setInterval(() => {
      if (widgetsAvailable()) {
        setAvailable(true)
        clearInterval(id)
      }
    }, 250)
    const stop = setTimeout(() => clearInterval(id), 10000)
    return () => { clearInterval(id); clearTimeout(stop) }
  }, [available])

  return available
}
