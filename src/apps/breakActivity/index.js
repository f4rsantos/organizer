import { Coffee } from 'lucide-react'
import { BreakActivityAppModal } from '@/components/settings/apps/BreakActivityAppModal'
import { defaultBreakActivity } from '@/lib/breakActivity/breakSettings'

export const breakActivityApp = {
  id: 'breakActivity',
  labelKey: 'breakActivity',
  descKey: 'breakActivityDesc',
  icon: Coffee,
  keywords: ['break', 'pausa', 'sudoku', 'pomodoro', 'link', 'puzzle'],
  isEnabled: state => state.settings?.breakActivity?.enabled === true,
  setEnabled: (updateSettings, _apps, value, state) =>
    updateSettings({ breakActivity: { ...(state.settings?.breakActivity ?? defaultBreakActivity()), enabled: value } }),
  needsSetup: true,
  SettingsModal: BreakActivityAppModal,
  tab: null,
}
