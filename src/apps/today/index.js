import { Sunrise } from 'lucide-react'
import { TodayTab } from './TodayTab'
import { TodayAppModal } from '@/components/settings/apps/TodayAppModal'

export const TODAY_APP_ID = 'today'

export const todayApp = {
  id: TODAY_APP_ID,
  labelKey: 'todayBrief',
  descKey: 'todayBriefDesc',
  icon: Sunrise,
  keywordsKey: 'todayBriefKeywords',
  isEnabled: state => state.settings?.apps?.today === true,
  setEnabled: (updateSettings, apps, value) => updateSettings({ apps: { ...apps, today: value } }),
  SettingsModal: TodayAppModal,
  tab: { id: TODAY_APP_ID, component: TodayTab },
}
