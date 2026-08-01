import { useEffect } from 'react'
import { useStore } from '@/store/useStore'

const THEME_ORDER = ['light', 'dark', 'system']

function getSystemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return null
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
}

function mix(hex, targetHex, amount) {
  const a = hexToRgb(hex)
  const b = hexToRgb(targetHex)
  if (!a || !b) return hex
  const r = Math.round(a.r + (b.r - a.r) * amount)
  const g = Math.round(a.g + (b.g - a.g) * amount)
  const bl = Math.round(a.b + (b.b - a.b) * amount)
  return `#${[r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return 1
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastText(hex) {
  return relativeLuminance(hex) > 0.45 ? '#1a1a1a' : '#f5f5f5'
}

function syncThemeColorMeta(root) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  const resolved = getComputedStyle(document.body).backgroundColor
  if (resolved) meta.setAttribute('content', resolved)
  root.style.colorScheme = root.classList.contains('dark') ? 'dark' : 'light'
}

export function useTheme() {
  const theme = useStore(s => s.theme)
  const setTheme = useStore(s => s.setTheme)
  const themeFontColor = useStore(s => s.settings?.themeFontColor)
  const themeBgColor = useStore(s => s.settings?.themeBgColor)
  const themeHighlightColor = useStore(s => s.settings?.themeHighlightColor)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const root = document.documentElement

    const applyTheme = () => {
      const resolved = theme === 'system'
        ? (getSystemPrefersDark() ? 'dark' : 'light')
        : theme
      const isDark = resolved === 'dark'
      root.classList.toggle('dark', isDark)

      if (themeFontColor) {
        const accentBg = mix(themeFontColor, isDark ? '#000000' : '#ffffff', isDark ? 0.75 : 0.85)
        root.style.setProperty('--primary', themeFontColor)
        root.style.setProperty('--primary-foreground', contrastText(themeFontColor))
        root.style.setProperty('--accent', accentBg)
        root.style.setProperty('--accent-foreground', themeFontColor)
        root.style.setProperty('--ring', themeFontColor)
        root.style.setProperty('--wheel-primary', themeFontColor)
        root.style.setProperty('--wheel-track', accentBg)
      } else {
        root.style.removeProperty('--primary')
        root.style.removeProperty('--primary-foreground')
        root.style.removeProperty('--accent')
        root.style.removeProperty('--accent-foreground')
        root.style.removeProperty('--ring')
        root.style.removeProperty('--wheel-primary')
        root.style.removeProperty('--wheel-track')
      }

      if (themeBgColor) {
        const cardColor = mix(themeBgColor, isDark ? '#ffffff' : '#000000', isDark ? 0.06 : 0.03)
        root.style.setProperty('--background', themeBgColor)
        root.style.setProperty('--card', cardColor)
        root.style.setProperty('--popover', cardColor)
        root.style.setProperty('--foreground', contrastText(themeBgColor))
      } else {
        root.style.removeProperty('--background')
        root.style.removeProperty('--card')
        root.style.removeProperty('--popover')
        root.style.removeProperty('--foreground')
      }

      if (themeHighlightColor) {
        root.style.setProperty('--secondary', themeHighlightColor)
        root.style.setProperty('--secondary-foreground', contrastText(themeHighlightColor))
        root.style.setProperty('--muted', themeHighlightColor)
        root.style.setProperty('--muted-foreground', contrastText(themeHighlightColor))
      } else {
        root.style.removeProperty('--secondary')
        root.style.removeProperty('--secondary-foreground')
        root.style.removeProperty('--muted')
        root.style.removeProperty('--muted-foreground')
      }

      syncThemeColorMeta(root)
    }

    applyTheme()

    if (theme !== 'system') return undefined

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme, themeFontColor, themeBgColor, themeHighlightColor])

  const toggle = () => {
    const current = THEME_ORDER.includes(theme) ? theme : 'system'
    const currentIndex = THEME_ORDER.indexOf(current)
    setTheme(THEME_ORDER[(currentIndex + 1) % THEME_ORDER.length])
  }

  return { theme, toggle }
}
