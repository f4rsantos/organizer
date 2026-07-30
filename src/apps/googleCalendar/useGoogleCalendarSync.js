import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { loadGoogleClientId } from './googleAuth'
import { fetchGoogleEvents, createGoogleEvent, updateGoogleEvent, deleteGoogleEvent, fromGoogleEvent } from './googleApi'

const SYNC_INTERVAL_MS = 5 * 60 * 1000

function isEnabled(state) {
  return state.settings?.apps?.googleCalendar === true && !!loadGoogleClientId()
}

// Conflict rule: last-write-wins by timestamp. Google's `updated` field vs the
// local event's `updatedAt` (bumped on every addEvent/updateEvent) decide which
// side overwrites the other on each sync pass. No merge, no manual resolution.
async function reconcile(state, remoteItems) {
  const events = state.events ?? []
  const byGoogleId = new Map(events.filter(e => e.googleEventId).map(e => [e.googleEventId, e]))
  const seenGoogleIds = new Set()

  for (const item of remoteItems) {
    seenGoogleIds.add(item.id)
    const local = byGoogleId.get(item.id)
    const mapped = fromGoogleEvent(item, local)
    if (!mapped) continue
    if (!local) {
      useStore.getState().upsertGoogleEvent(mapped)
      continue
    }
    const localUpdatedAt = local.updatedAt ?? 0
    if (mapped.updatedAt > localUpdatedAt) {
      useStore.getState().upsertGoogleEvent({ ...mapped, id: local.id })
    } else if (localUpdatedAt > mapped.updatedAt) {
      await pushLocalEvent(local)
    }
  }

  const toPush = events.filter(e => e.syncToGoogle && !e.googleEventId)
  for (const e of toPush) await pushLocalEvent(e)

  const deletedRemotely = events.filter(e => e.googleEventId && !seenGoogleIds.has(e.googleEventId))
  for (const e of deletedRemotely) useStore.getState().removeGoogleEvent(e.googleEventId)
}

async function pushLocalEvent(event) {
  if (event.googleEventId) {
    const updated = await updateGoogleEvent(event.googleEventId, event)
    useStore.getState().updateEvent(event.id, { updatedAt: new Date(updated.updated).getTime() })
  } else {
    const created = await createGoogleEvent(event)
    useStore.getState().updateEvent(event.id, { googleEventId: created.id, updatedAt: new Date(created.updated).getTime() })
  }
}

export async function pushEventDeletion(googleEventId) {
  if (!googleEventId) return
  try { await deleteGoogleEvent(googleEventId) } catch {
    // may already be deleted in Google Calendar
  }
}

export function useGoogleCalendarSync() {
  const refs = useRef({ isSyncing: false })
  const [status, setStatus] = useState('idle')

  const sync = useCallback(async () => {
    const state = useStore.getState()
    if (!isEnabled(state)) return
    if (refs.current.isSyncing) return
    refs.current.isSyncing = true
    setStatus('syncing')
    try {
      const remoteItems = await fetchGoogleEvents()
      await reconcile(useStore.getState(), remoteItems)
      setStatus('ok')
    } catch {
      setStatus('error')
    } finally {
      refs.current.isSyncing = false
    }
  }, [])

  useEffect(() => {
    sync()
    const onFocus = () => sync()
    window.addEventListener('focus', onFocus)
    const id = setInterval(sync, SYNC_INTERVAL_MS)
    return () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(id)
    }
  }, [sync])

  return { status, syncNow: sync }
}
