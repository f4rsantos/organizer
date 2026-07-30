import { parseISO, format, subDays, subMonths, addMonths, isValid } from 'date-fns'
import { getOrRefreshAccessToken, requestAccessToken, clearAccessToken } from './googleAuth'

const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const GOOGLE_COLOR = '#4285F4'

function computeWindow() {
  const now = new Date()
  return { timeMin: subMonths(now, 3).toISOString(), timeMax: addMonths(now, 6).toISOString() }
}

async function withAuthRetry(fn) {
  const token = await getOrRefreshAccessToken()
  let res = await fn(token)
  if (res.status === 401) {
    clearAccessToken()
    const fresh = await requestAccessToken({ prompt: '' })
    res = await fn(fresh)
  }
  return res
}

async function withBackoff(fn, attempt = 0) {
  const res = await fn()
  if (res.status === 429 && attempt < 3) {
    const wait = 500 * 2 ** attempt
    await new Promise(r => setTimeout(r, wait))
    return withBackoff(fn, attempt + 1)
  }
  return res
}

export async function fetchGoogleEvents() {
  const { timeMin, timeMax } = computeWindow()
  const params = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime', maxResults: '2500', timeMin, timeMax })
  const res = await withAuthRetry(token => withBackoff(() => fetch(`${EVENTS_URL}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })))
  if (!res.ok) throw new Error(`google-events-fetch-failed:${res.status}`)
  const json = await res.json()
  return Array.isArray(json.items) ? json.items : []
}

export async function createGoogleEvent(payload) {
  const res = await withAuthRetry(token => withBackoff(() => fetch(EVENTS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toGoogleBody(payload)),
  })))
  if (!res.ok) throw new Error(`google-event-create-failed:${res.status}`)
  return res.json()
}

export async function updateGoogleEvent(googleEventId, payload) {
  const res = await withAuthRetry(token => withBackoff(() => fetch(`${EVENTS_URL}/${encodeURIComponent(googleEventId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toGoogleBody(payload)),
  })))
  if (!res.ok) throw new Error(`google-event-update-failed:${res.status}`)
  return res.json()
}

export async function deleteGoogleEvent(googleEventId) {
  const res = await withAuthRetry(token => withBackoff(() => fetch(`${EVENTS_URL}/${encodeURIComponent(googleEventId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })))
  if (!res.ok && res.status !== 404 && res.status !== 410) throw new Error(`google-event-delete-failed:${res.status}`)
}

function toGoogleBody(event) {
  const summary = event.title ?? ''
  const description = event.note ?? ''
  if (event.startTime) {
    const firstDay = event.date ?? event.startDate
    const lastDay = event.date ?? event.endDate ?? event.startDate
    if (firstDay) {
      return {
        summary, description,
        start: { dateTime: `${firstDay}T${event.startTime}:00` },
        end: { dateTime: `${lastDay}T${(event.endTime ?? event.startTime)}:00` },
      }
    }
  }
  const startDate = event.date ?? event.startDate
  const endDate = event.endDate ?? event.date ?? event.startDate
  return {
    summary, description,
    start: { date: startDate },
    end: { date: format(subDays(parseISO(endDate), -1), 'yyyy-MM-dd') },
  }
}

function fromGoogleDates(item) {
  const startDate = item.start?.date
  if (startDate) {
    const inclusiveEnd = item.end?.date ? format(subDays(parseISO(item.end.date), 1), 'yyyy-MM-dd') : startDate
    if (inclusiveEnd === startDate) return { date: startDate, allDay: true, startTime: null, endTime: null }
    return { startDate, endDate: inclusiveEnd, date: null, allDay: true, startTime: null, endTime: null }
  }
  const startDateTime = item.start?.dateTime
  if (startDateTime) {
    const start = parseISO(startDateTime)
    const end = item.end?.dateTime ? parseISO(item.end.dateTime) : start
    if (!isValid(start)) return null
    const firstDay = format(start, 'yyyy-MM-dd')
    const lastDay = isValid(end) ? format(end, 'yyyy-MM-dd') : firstDay
    const startTime = format(start, 'HH:mm')
    const endTime = isValid(end) ? format(end, 'HH:mm') : startTime
    if (lastDay !== firstDay) {
      return { date: null, startDate: firstDay, endDate: lastDay, allDay: false, startTime, endTime }
    }
    return { date: firstDay, allDay: false, startTime, endTime }
  }
  return null
}

export function fromGoogleEvent(item, existing) {
  const dates = fromGoogleDates(item)
  if (!dates) return null
  const updatedAt = item.updated ? new Date(item.updated).getTime() : Date.now()
  return {
    id: existing?.id ?? `gcal-${item.id}`,
    title: item.summary ?? '',
    note: item.description ?? '',
    color: existing?.color ?? GOOGLE_COLOR,
    semesterId: existing?.semesterId ?? null,
    googleEventId: item.id,
    syncToGoogle: true,
    updatedAt,
    ...dates,
  }
}
