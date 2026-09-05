function parseHex(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex ?? '').trim())
  if (!m) return null
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1]
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function channel(v) {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex) {
  const rgb = parseHex(hex)
  if (!rgb) return null
  const [r, g, b] = rgb.map(channel)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  if (la == null || lb == null) return null
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

export function darken(hex, amount) {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const out = rgb.map(v => Math.round(v * (1 - amount)))
  return `#${out.map(v => v.toString(16).padStart(2, '0')).join('')}`
}

export function lighten(hex, amount) {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const out = rgb.map(v => Math.round(v + (255 - v) * amount))
  return `#${out.map(v => v.toString(16).padStart(2, '0')).join('')}`
}

// Event blocks paint the colour as text over a faint tint of itself, which a
// pastel cannot carry. Darken until the text clears a readable ratio against
// the block background rather than swapping in an unrelated colour.
export function readableTextColor(hex, { background = '#ffffff', minRatio = 4.5 } = {}) {
  if (!parseHex(hex)) return hex
  const bgLum = relativeLuminance(background) ?? 1
  const shift = bgLum > 0.4 ? darken : lighten

  let candidate = hex
  for (let step = 0; step < 12; step++) {
    const ratio = contrastRatio(candidate, background)
    if (ratio != null && ratio >= minRatio) return candidate
    candidate = shift(candidate, 0.15)
  }
  return candidate
}
