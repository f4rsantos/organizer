import { useEffect } from 'react'
import { format } from 'date-fns'
import { useStore } from '@/store/useStore'
import { readDevicePref, writeDevicePref } from '@/lib/devicePrefs'
import { normalizeTodaySettings } from '@/lib/today/todaySettings'
import { TODAY_APP_ID } from './index'

const LAST_SHOWN_PREF = 'todayBriefLastShown'

function landOnTodayOncePerDay() {
  const settings = useStore.getState().settings
  if (settings?.apps?.today !== true) return
  if (!normalizeTodaySettings(settings.todayBrief).showOnOpen) return
  const today = format(new Date(), 'yyyy-MM-dd')
  if (readDevicePref(LAST_SHOWN_PREF) === today) return
  writeDevicePref(LAST_SHOWN_PREF, today)
  useStore.getState().setActiveTab(TODAY_APP_ID)
}

export function useTodayLanding(hydrated) {
  useEffect(() => {
    if (!hydrated) return
    if (!new URLSearchParams(window.location.search).get('tab')) landOnTodayOncePerDay()
    const onVisible = () => {
      if (document.visibilityState === 'visible') landOnTodayOncePerDay()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [hydrated])
}
