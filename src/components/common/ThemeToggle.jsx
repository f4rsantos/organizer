import { Laptop, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const label = {
    light: t.themeLight,
    dark: t.themeDark,
    system: t.themeSystem,
  }[theme] ?? t.themeSystem

  return (
    <Button variant="ghost" size="icon" onClick={toggle} className="rounded-full" title={label}>
      {theme === 'dark' && <Moon className="h-4 w-4" />}
      {theme === 'light' && <Sun className="h-4 w-4" />}
      {theme === 'system' && <Laptop className="h-4 w-4" />}
    </Button>
  )
}
