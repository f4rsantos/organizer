import { Sparkles } from 'lucide-react'
import { AiAppModal } from '@/components/settings/apps/AiAppModal'
import { clearAllAiKeys } from '@/lib/ai/keys'
import { clearAllConsent } from '@/components/settings/apps/ai/aiConsent'
import { clearBudgetState } from '@/lib/ai/budget'
import { AiTab } from './AiTab'

export const aiAssistantApp = {
  id: 'aiAssistant',
  labelKey: 'aiAssistant',
  icon: Sparkles,
  keywords: ['ai', 'assistant', 'agent', 'llm', 'anthropic', 'claude', 'ollama'],
  isEnabled: state => state.settings?.apps?.aiAssistant === true,
  needsSetup: true,
  setEnabled: (updateSettings, apps, value) => updateSettings({ apps: { ...apps, aiAssistant: value } }),
  cleanup: state => {
    clearAllAiKeys()
    clearAllConsent()
    clearBudgetState()
    return state
  },
  SettingsModal: AiAppModal,
  tab: { id: 'aiAssistant', component: AiTab },
}
