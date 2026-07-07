import { MonitorSmartphone } from 'lucide-react'
import { StandbyAppModal } from '@/components/settings/apps/StandbyAppModal'

const DEFAULT_STANDBY = { enabled: false, panelCount: 3, panes: ['wheel-time', 'calendar', 'tasks-by-category'] }

export const standbyApp = {
  id: 'standby',
  labelKey: 'standby',
  icon: MonitorSmartphone,
  keywords: ['standby', 'repouso', 'ambient', 'dashboard', 'clock', 'landscape'],
  isEnabled: state => state.settings?.standby?.enabled === true,
  setEnabled: (updateSettings, _apps, value, state) => updateSettings({ standby: { ...(state.settings?.standby ?? DEFAULT_STANDBY), enabled: value } }),
  wipe: state => ({ ...state, settings: { ...state.settings, standby: { ...DEFAULT_STANDBY } } }),
  SettingsModal: StandbyAppModal,
  tab: null,
}
