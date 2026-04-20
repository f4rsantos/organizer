import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'

export function LangToggle() {
  const lang = useStore(s => s.lang ?? 'en')
  const setLang = useStore(s => s.setLang)
  return (
    <Button variant="ghost" size="sm" onClick={() => setLang(lang === 'en' ? 'pt' : 'en')}
      className="rounded-full text-xs font-semibold h-8 px-2.5 text-muted-foreground">
      {lang === 'en' ? 'EN' : 'PT'}
    </Button>
  )
}
