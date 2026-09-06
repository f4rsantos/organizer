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

function rgbToHsl({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0))
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return { h: (h * 60 + 360) % 360, s, l }
}

function hslToHex({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = ((h % 360) + 360) % 360 / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x]
  const m = l - c / 2
  const to = v => Math.round(Math.max(0, Math.min(1, v + m)) * 255)
  return `#${[to(r1), to(g1), to(b1)].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

function doneGradient(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return [hex, hex]
  const { h, s, l } = rgbToHsl(rgb)
  const up = l <= 0.62
  const delta = 0.16 * (s < 0.12 ? 0.7 : 1)
  const near = { h, s, l: Math.max(0.06, Math.min(0.94, l)) }
  const far = {
    h: h + (up ? 8 : -8),
    s: Math.max(0, Math.min(1, s * (up ? 0.94 : 1.04))),
    l: Math.max(0.06, Math.min(0.94, up ? l + delta : l - delta)),
  }
  return [hslToHex(near), hslToHex(far)]
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
  const themeDoneColor = useStore(s => s.settings?.themeDoneColor)

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
        root.style.setProperty('--wheel-to', `oklch(from ${themeFontColor} calc(l + 0.1) c calc(h + 30))`)
        root.style.setProperty('--wheel-track', accentBg)
      } else {
        root.style.removeProperty('--primary')
        root.style.removeProperty('--primary-foreground')
        root.style.removeProperty('--accent')
        root.style.removeProperty('--accent-foreground')
        root.style.removeProperty('--ring')
        root.style.removeProperty('--wheel-primary')
        root.style.removeProperty('--wheel-to')
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
        const surface = isDark
          ? mix(themeHighlightColor, '#000000', 0.72)
          : mix(themeHighlightColor, '#ffffff', 0.08)
        const surfaceText = contrastText(surface)
        const pageBg = themeBgColor || (isDark ? '#0b0b0c' : '#ffffff')
        const pageFg = themeBgColor ? contrastText(themeBgColor) : (isDark ? '#f5f5f5' : '#1a1a1a')
        root.style.setProperty('--secondary', surface)
        root.style.setProperty('--secondary-foreground', surfaceText)
        root.style.setProperty('--muted', surface)
        root.style.setProperty('--muted-foreground', mix(pageFg, pageBg, isDark ? 0.35 : 0.4))
      } else {
        root.style.removeProperty('--secondary')
        root.style.removeProperty('--secondary-foreground')
        root.style.removeProperty('--muted')
        root.style.removeProperty('--muted-foreground')
      }

      if (themeDoneColor) {
        const done = isDark ? mix(themeDoneColor, '#ffffff', 0.12) : themeDoneColor
        const [from, to] = doneGradient(done)
        root.style.setProperty('--done', done)
        root.style.setProperty('--done-foreground', contrastText(done))
        root.style.setProperty('--done-from', from)
        root.style.setProperty('--done-to', to)
      } else {
        root.style.removeProperty('--done')
        root.style.removeProperty('--done-foreground')
        root.style.removeProperty('--done-from')
        root.style.removeProperty('--done-to')
      }

      syncThemeColorMeta(root)
    }

    applyTheme()

    if (theme !== 'system') return undefined

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme, themeFontColor, themeBgColor, themeHighlightColor, themeDoneColor])

  const toggle = () => {
    const current = THEME_ORDER.includes(theme) ? theme : 'system'
    const currentIndex = THEME_ORDER.indexOf(current)
    setTheme(THEME_ORDER[(currentIndex + 1) % THEME_ORDER.length])
  }

  return { theme, toggle }
}
