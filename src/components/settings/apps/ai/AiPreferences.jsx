import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { CUSTOM_INSTRUCTIONS_MAX_LENGTH } from '@/lib/ai/context'
import { AI_PREFERENCES_DEBOUNCE_MS } from './aiSlotHelpers'

function useDebouncedTextField(externalValue, onCommit, delayMs) {
  const [draft, setDraft] = useState(externalValue ?? '')
  const [syncedExternalValue, setSyncedExternalValue] = useState(externalValue ?? '')

  if (externalValue !== syncedExternalValue && draft === syncedExternalValue) {
    setDraft(externalValue ?? '')
    setSyncedExternalValue(externalValue ?? '')
  }

  useEffect(() => {
    if (draft === (externalValue ?? '')) return
    const id = setTimeout(() => onCommit(draft), delayMs)
    return () => clearTimeout(id)
  }, [draft, externalValue, onCommit, delayMs])

  return [draft, setDraft]
}

export function AiPreferences({ t, value, onChange }) {
  const [draft, setDraft] = useDebouncedTextField(value, onChange, AI_PREFERENCES_DEBOUNCE_MS)

  const handleChange = e => {
    setDraft(e.target.value.slice(0, CUSTOM_INSTRUCTIONS_MAX_LENGTH))
  }

  return (
    <div className="space-y-1.5 border-t border-border/50 pt-4">
      <Label>{t.aiPreferencesLabel}</Label>
      <textarea
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition"
        rows={4}
        value={draft}
        onChange={handleChange}
        placeholder={t.aiPreferencesPlaceholder}
      />
      <p className="text-xs text-muted-foreground text-right">{draft.length}/{CUSTOM_INSTRUCTIONS_MAX_LENGTH}</p>
    </div>
  )
}
