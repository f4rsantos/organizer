import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { normalizeTodaySettings } from '@/lib/today/todaySettings'

export function useTodaySettings() {
  const raw = useStore(s => s.settings?.todayBrief)
  return useMemo(() => normalizeTodaySettings(raw), [raw])
}
