import { TomatoIcon } from '@/components/icons/TomatoIcon'
import { PomodoroAppModal } from '@/components/settings/apps/PomodoroAppModal'

export const pomodoroApp = {
  id: 'pomodoro',
  labelKey: 'pomodoro',
  icon: TomatoIcon,
  keywords: ['pomodoro', 'focus', 'timer', 'tomato'],
  isEnabled: state => state.settings?.pomodoro?.enabled === true,
  wipe: state => ({ ...state, pomodoros: [] }),
  SettingsModal: PomodoroAppModal,
}
