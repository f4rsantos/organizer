import { CalendarClock } from 'lucide-react'
import { GoogleCalendarAppModal } from '@/components/settings/apps/GoogleCalendarAppModal'
import { clearGoogleClientId } from './googleAuth'

function isEnabled(state) {
  return state.settings?.apps?.googleCalendar === true
}

export const googleCalendarApp = {
  id: 'googleCalendar',
  labelKey: 'googleCalendar',
  icon: CalendarClock,
  keywords: ['google', 'calendar', 'calendário', 'sync', 'sincronização', 'oauth'],
  isEnabled,
  setEnabled: (updateSettings, apps, value) => updateSettings({ apps: { ...apps, googleCalendar: value } }),
  // Google-sourced events live directly in state.events (googleEventId set), so
  // wiping just strips those rather than clearing the whole events array.
  wipe: state => {
    clearGoogleClientId()
    return { ...state, events: (state.events ?? []).filter(e => !e.googleEventId) }
  },
  SettingsModal: GoogleCalendarAppModal,
  tab: null,
}
