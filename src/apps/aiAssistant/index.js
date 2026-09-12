import { Sparkles } from 'lucide-react'
import { AiAppModal } from '@/components/settings/apps/AiAppModal'
import { emptyJournal } from '@/lib/ai/journal'

export const aiAssistantApp = {
  id: 'aiAssistant',
  labelKey: 'aiAssistant',
  icon: Sparkles,
  keywords: ['ai', 'assistant', 'agent', 'llm', 'anthropic', 'claude', 'ollama'],
  isEnabled: state => state.settings?.apps?.aiAssistant === true,
  setEnabled: (updateSettings, apps, value) => updateSettings({ apps: { ...apps, aiAssistant: value } }),
  wipe: state => ({
    ...state,
    agentRuntime: { runs: {}, activeRunId: null },
    agentJournal: emptyJournal(),
  }),
  SettingsModal: AiAppModal,
  tab: null,
}
