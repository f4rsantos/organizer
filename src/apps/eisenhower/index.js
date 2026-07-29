import { LayoutGrid } from 'lucide-react'
import { EisenhowerAppModal } from '@/components/settings/apps/EisenhowerAppModal'
import { EisenhowerTab } from './EisenhowerTab'

export const eisenhowerApp = {
  id: 'eisenhower',
  labelKey: 'eisenhower',
  icon: LayoutGrid,
  keywords: ['eisenhower', 'matrix', 'urgent', 'important', 'priority'],
  isEnabled: state => state.settings?.apps?.eisenhower === true,
  setEnabled: (updateSettings, apps, value) => updateSettings({ apps: { ...apps, eisenhower: value } }),
  wipe: state => ({
    ...state,
    tasks: (state.tasks ?? []).map(t => t.eisenhower ? { ...t, eisenhower: null } : t),
  }),
  SettingsModal: EisenhowerAppModal,
  tab: { id: 'eisenhower', component: EisenhowerTab },
}
