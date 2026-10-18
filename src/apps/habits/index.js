import { Target } from 'lucide-react'
import { HabitsTab } from './HabitsTab'

export const habitsApp = {
  id: 'habits',
  labelKey: 'habits',
  descKey: 'habitsEnableDesc',
  icon: Target,
  keywords: ['habits', 'habit', 'streak', 'objetivos', 'metas', 'hábito', 'ziel'],
  isEnabled: state => state.settings?.apps?.habits === true,
  setEnabled: (updateSettings, apps, value) => updateSettings({ apps: { ...apps, habits: value } }),
  wipe: state => ({ ...state, habits: [] }),
  SettingsModal: null,
  tab: { id: 'habits', component: HabitsTab },
}
