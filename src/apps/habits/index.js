import { Target } from 'lucide-react'
import { HabitsAppModal } from '@/components/settings/apps/HabitsAppModal'
import { HabitsTab } from './HabitsTab'

export const habitsApp = {
  id: 'habits',
  labelKey: 'habits',
  icon: Target,
  keywords: ['habits', 'habit', 'streak', 'objetivos', 'metas', 'hábito', 'ziel'],
  isEnabled: state => state.settings?.apps?.habits === true,
  setEnabled: (updateSettings, apps, value) => updateSettings({ apps: { ...apps, habits: value } }),
  wipe: state => ({ ...state, habits: [] }),
  SettingsModal: HabitsAppModal,
  tab: { id: 'habits', component: HabitsTab },
}
