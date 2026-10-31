import { BookOpenCheck } from 'lucide-react'
import { ClassesPanelTab } from './ClassesPanelTab'
import { ClassesPanelAppModal } from '@/components/settings/apps/ClassesPanelAppModal'

export const classesPanelApp = {
  id: 'classesPanel',
  labelKey: 'classesPanel',
  descKey: 'classesPanelDesc',
  icon: BookOpenCheck,
  keywordsKey: 'classesPanelKeywords',
  isEnabled: state => state.settings?.apps?.classesPanel === true,
  setEnabled: (updateSettings, apps, value) => updateSettings({ apps: { ...apps, classesPanel: value } }),
  SettingsModal: ClassesPanelAppModal,
  tab: { id: 'classesPanel', component: ClassesPanelTab },
}
