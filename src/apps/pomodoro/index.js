import { TomatoIcon } from '@/components/icons/TomatoIcon'
import { PomodoroAppModal } from '@/components/settings/apps/PomodoroAppModal'

export const pomodoroApp = {
  id: 'pomodoro',
  labelKey: 'pomodoro',
  descKey: 'pomodoroModeDesc',
  icon: TomatoIcon,
  keywords: ['pomodoro', 'focus', 'timer', 'tomato'],
  isEnabled: state => state.settings?.pomodoro?.enabled === true,
  setEnabled: (updateSettings, _apps, value, state) => updateSettings({ pomodoro: { ...state.settings?.pomodoro, enabled: value } }),
  wipe: state => ({ ...state, pomodoros: [] }),
  SettingsModal: PomodoroAppModal,
}
