import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { parseISO, subDays, subMonths, format, isValid } from 'date-fns'
import { selectActiveSemester } from '@/store/selectors'
import { PRESET_GROUPS } from '@/lib/presets'
import { EICalendarAppModal } from '@/components/settings/apps/EICalendarAppModal'

const CAL_ID = '7m2mlm7k1huomjeaa45gbhog0k@group.calendar.google.com'
const API_KEY = 'AIzaSyDnT8fO6ARjx3OxMJCimhenNDLTkGuOmjE'
const CAL_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CAL_ID)}/events`
const EI_COLOR = '#0891b2'
const EMPTY = []

function isEIKey(key) {
  return !!key && PRESET_GROUPS.EI.includes(key)
}

function isEnabled(state) {
  return state.settings?.apps?.eiCalendar !== false
}

function computeTimeMin(startDate) {
  const start = startDate ? parseISO(startDate) : null
  const base = start && isValid(start) ? start : subMonths(new Date(), 1)
  return base.toISOString()
}

function buildUrl(timeMin) {
  const params = new URLSearchParams({
    singleEvents: 'true', orderBy: 'startTime', maxResults: '2500', timeMin, key: API_KEY,
  })
  return `${CAL_URL}?${params}`
}

function parseTags(summary) {
  const digits = new Set()
  let rest = summary ?? ''
  let match
  while ((match = rest.match(/^\s*\[([^\]]+)\]/))) {
    const tag = match[1].trim().toUpperCase()
    const year = tag.match(/^(\d)A$/)
    if (year) digits.add(year[1])
    rest = rest.slice(match[0].length)
  }
  return { digits, title: rest.trim() }
}

function matchesYear(digits, digit) {
  return digits.size > 0 && digits.has(digit)
}

function mapDates(item) {
  const startDate = item.start?.date
  if (startDate) {
    const inclusiveEnd = item.end?.date ? format(subDays(parseISO(item.end.date), 1), 'yyyy-MM-dd') : startDate
    if (inclusiveEnd === startDate) return { date: startDate }
    return { startDate, endDate: inclusiveEnd }
  }
  const dateTime = item.start?.dateTime
  if (dateTime) return { date: dateTime.slice(0, 10) }
  return null
}

function toEvent(item, title) {
  const dates = mapDates(item)
  if (!dates) return null
  return { id: 'ei-' + item.id, title, color: EI_COLOR, note: '', _remote: true, ...dates }
}

function parseItems(items, digit) {
  return items.reduce((acc, item) => {
    const { digits, title } = parseTags(item.summary ?? '')
    if (!matchesYear(digits, digit)) return acc
    const event = toEvent(item, title)
    if (event) acc.push(event)
    return acc
  }, [])
}

export function useEICalendarEvents(state) {
  const sem = selectActiveSemester(state)
  const presetKey = sem?.presetKey
  const enabled = isEnabled(state) && isEIKey(presetKey)
  const digit = presetKey?.[0]
  const startDate = sem?.startDate
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (!enabled) return
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(buildUrl(computeTimeMin(startDate)), { signal: ctrl.signal })
        if (!res.ok) return
        const json = await res.json()
        setEvents(parseItems(json.items ?? [], digit))
      } catch (err) {
        if (err.name !== 'AbortError') setEvents([])
      }
    })()
    return () => ctrl.abort()
  }, [enabled, presetKey, startDate, digit])

  return enabled ? events : EMPTY
}

export const eiCalendarApp = {
  id: 'eiCalendar',
  labelKey: 'eiCalendar',
  icon: CalendarDays,
  keywords: ['ei', 'calendar', 'calendário', 'deadlines', 'exames', 'course', 'curso'],
  isVisible: state => isEIKey(selectActiveSemester(state)?.presetKey),
  isEnabled,
  setEnabled: (updateSettings, apps, value) => updateSettings({ apps: { ...apps, eiCalendar: value } }),
  wipe: state => state,
  SettingsModal: EICalendarAppModal,
  tab: null,
  useCalendarEvents: useEICalendarEvents,
}
