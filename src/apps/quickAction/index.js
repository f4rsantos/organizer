import { Zap } from 'lucide-react'
import { QuickActionAppModal } from '@/components/settings/apps/QuickActionAppModal'

export const quickActionApp = {
  id: 'quickAction',
  labelKey: 'quickActionApp',
  icon: Zap,
  keywords: ['quick', 'action', 'add', 'spotlight', 'command'],
  isEnabled: state => state.settings?.apps?.quickAction !== false,
  setEnabled: (updateSettings, apps, value) => updateSettings({ apps: { ...apps, quickAction: value } }),
  wipe: state => state,
  SettingsModal: QuickActionAppModal,
}
