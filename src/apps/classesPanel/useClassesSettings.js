import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { normalizeClassesSettings } from '@/lib/classes/classesSettings'

export function useClassesSettings() {
  const raw = useStore(s => s.settings?.classesPanel)
  return useMemo(() => normalizeClassesSettings(raw), [raw])
}
