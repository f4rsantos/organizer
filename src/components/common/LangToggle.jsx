import { useStore } from '@/store/useStore'
import { LANGS } from '@/lib/langs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export function LangToggle() {
  const lang = useStore(s => s.lang ?? 'en')
  const setLang = useStore(s => s.setLang)
  const current = LANGS.find(l => l.code === lang) ?? LANGS[0]
  return (
    <Select value={lang} onValueChange={setLang}>
      <SelectTrigger
        size="sm"
        className="h-8 gap-1.5 rounded-full border-none px-2.5 text-xs font-semibold text-muted-foreground shadow-none hover:bg-accent"
        aria-label="Language">
        <SelectValue>{current.short}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {LANGS.map(l => (
          <SelectItem key={l.code} value={l.code}>
            <span className="font-semibold text-muted-foreground">{l.short}</span>
            <span>{l.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
