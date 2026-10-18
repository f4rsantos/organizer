import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { nativeTabBarAvailable } from '@/lib/nativeChrome'

export function useLiquidGlass() {
  const available = useMemo(() => nativeTabBarAvailable(), [])
  const enabled = useStore(s => s.settings?.navbar?.nativeGlass ?? true)
  return available && enabled
}
