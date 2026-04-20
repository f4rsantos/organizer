import { useEffect } from 'react'
import { useStore } from '@/store/useStore'

const THEME_ORDER = ['light', 'dark', 'system']

function getSystemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTheme() {
  const theme = useStore(s => s.theme)
  const setTheme = useStore(s => s.setTheme)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const root = document.documentElement

    const applyTheme = () => {
      const resolved = theme === 'system'
        ? (getSystemPrefersDark() ? 'dark' : 'light')
        : theme
      root.classList.toggle('dark', resolved === 'dark')
    }

    applyTheme()

    if (theme !== 'system') return undefined

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  const toggle = () => {
    const current = THEME_ORDER.includes(theme) ? theme : 'system'
    const currentIndex = THEME_ORDER.indexOf(current)
    setTheme(THEME_ORDER[(currentIndex + 1) % THEME_ORDER.length])
  }

  return { theme, toggle }
}
