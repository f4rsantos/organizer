import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { isNativePlatform } from '@/lib/platform'
import { defaultBreakActivity, normalizeBreakUrl } from '@/lib/breakActivity/breakSettings'
import { SettingList, SettingRow, SettingSelect } from './SettingRow'

function BreakUrlField({ t, url, onSave }) {
  const [draft, setDraft] = useState(url)
  const invalid = draft.trim() !== '' && normalizeBreakUrl(draft) === null

  const commit = () => {
    if (invalid) return
    onSave(normalizeBreakUrl(draft) ?? '')
  }

  return (
    <SettingRow label={t.breakActivityUrl} desc={isNativePlatform() ? t.breakActivityNativeHint : t.breakActivityUrlDesc}>
      <Input value={draft} inputMode="url" placeholder={t.breakActivityUrlPlaceholder} aria-invalid={invalid}
        onChange={e => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit() }} />
      {invalid && <p className="text-xs text-destructive">{t.breakActivityUrlInvalid}</p>}
    </SettingRow>
  )
}

export function BreakActivitySettings() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const config = useStore(s => s.settings?.breakActivity ?? defaultBreakActivity())
  const update = useStore(s => s.updateBreakActivitySettings)

  const modeOptions = [
    { value: 'sudoku', label: t.sudoku },
    { value: 'link', label: t.breakActivityModeLink },
  ]
  const difficultyOptions = [
    { value: 'easy', label: t.sudokuEasy },
    { value: 'medium', label: t.sudokuMedium },
    { value: 'hard', label: t.sudokuHard },
  ]

  return (
    <SettingList>
      <SettingSelect label={t.breakActivityMode} value={config.mode} options={modeOptions}
        onChange={mode => update({ mode })} />
      {config.mode === 'link' && <BreakUrlField t={t} url={config.url} onSave={url => update({ url })} />}
      {config.mode === 'sudoku' && (
        <SettingSelect label={t.sudokuDifficulty} desc={t.sudokuDifficultyDesc} value={config.difficulty}
          options={difficultyOptions} onChange={difficulty => update({ difficulty })} />
      )}
    </SettingList>
  )
}
