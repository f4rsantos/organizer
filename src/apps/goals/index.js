import { Target } from 'lucide-react'
import { GoalsAppModal } from '@/components/settings/apps/GoalsAppModal'
import { GoalsTab } from './GoalsTab'

export const goalsApp = {
  id: 'goals',
  labelKey: 'goals',
  icon: Target,
  keywords: ['goals', 'goal', 'habit', 'streak', 'objetivos', 'metas', 'hábito', 'ziel'],
  isEnabled: state => state.settings?.apps?.goals === true,
  setEnabled: (updateSettings, apps, value) => updateSettings({ apps: { ...apps, goals: value } }),
  wipe: state => ({ ...state, goals: [] }),
  SettingsModal: GoalsAppModal,
  tab: { id: 'goals', component: GoalsTab },
}
