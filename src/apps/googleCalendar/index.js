import { CalendarClock } from 'lucide-react'
import { GoogleCalendarAppModal } from '@/components/settings/apps/GoogleCalendarAppModal'
import { disconnectGoogle } from './googleAuth'

function isEnabled(state) {
  return state.settings?.apps?.googleCalendar === true
}

export const googleCalendarApp = {
  id: 'googleCalendar',
  labelKey: 'googleCalendar',
  icon: CalendarClock,
  keywords: ['google', 'calendar', 'calendário', 'sync', 'sincronização', 'oauth'],
  isEnabled,
  needsSetup: true,
  setEnabled: (updateSettings, apps, value) => updateSettings({ apps: { ...apps, googleCalendar: value } }),
  cleanup: state => {
    disconnectGoogle()
    return { ...state, events: (state.events ?? []).filter(e => !e.googleEventId) }
  },
  SettingsModal: GoogleCalendarAppModal,
  tab: null,
}
