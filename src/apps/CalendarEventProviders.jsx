import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { CALENDAR_PROVIDERS } from './registry'

function ProviderSlot({ plugin, onEvents }) {
  const state = useStore(s => s)
  const events = plugin.useCalendarEvents(state)
  useEffect(() => { onEvents(plugin.id, events) }, [events, plugin.id, onEvents])
  return null
}

export function CalendarEventProviders({ onEvents }) {
  return CALENDAR_PROVIDERS.map(plugin => (
    <ProviderSlot key={plugin.id} plugin={plugin} onEvents={onEvents} />
  ))
}
