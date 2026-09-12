import { Sparkles } from 'lucide-react'
import { AiAppModal } from '@/components/settings/apps/AiAppModal'
import { emptyJournal } from '@/lib/ai/journal'
import { clearAllAiKeys } from '@/lib/ai/keys'
import { clearAllConsent } from '@/components/settings/apps/ai/aiConsent'
import { clearBudgetState } from '@/lib/ai/budget'

export const aiAssistantApp = {
  id: 'aiAssistant',
  labelKey: 'aiAssistant',
  icon: Sparkles,
  keywords: ['ai', 'assistant', 'agent', 'llm', 'anthropic', 'claude', 'ollama'],
  isEnabled: state => state.settings?.apps?.aiAssistant === true,
  setEnabled: (updateSettings, apps, value) => updateSettings({ apps: { ...apps, aiAssistant: value } }),
  wipe: state => {
    clearAllAiKeys()
    clearAllConsent()
    clearBudgetState()
    return {
      ...state,
      agentRuntime: { runs: {}, activeRunId: null },
      agentJournal: emptyJournal(),
      settings: { ...state.settings, apps: { ...state.settings?.apps, ai: undefined } },
    }
  },
  SettingsModal: AiAppModal,
  tab: null,
}
