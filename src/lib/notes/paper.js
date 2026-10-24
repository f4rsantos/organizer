export const PAPER_PATTERNS = ['none', 'lines', 'grid']
export const PAPER_STYLES = ['solid', 'dashed', 'dotted']
export const DEFAULT_PAPER = { pattern: 'none', style: 'solid' }
export const PAPER_LINE_COLOR = 'rgba(128, 128, 128, 0.35)'

const DASH_STEPS_PER_CELL = 8
const TILE_SIZE = 24
const LINE_WIDTH = 1

export function normalizePaper(paper) {
  return {
    pattern: PAPER_PATTERNS.includes(paper?.pattern) ? paper.pattern : DEFAULT_PAPER.pattern,
    style: PAPER_STYLES.includes(paper?.style) ? paper.style : DEFAULT_PAPER.style,
  }
}

export function paperDash(style, spacing) {
  const step = spacing / DASH_STEPS_PER_CELL
  if (style === 'dashed') return [step, step]
  if (style === 'dotted') return [0, step]
  return []
}

export function paperDashOffset(style, spacing) {
  return style === 'dashed' ? spacing / DASH_STEPS_PER_CELL / 2 : 0
}

export function paperSegments(pattern, { minX, minY, maxX, maxY, spacing }) {
  if (pattern === 'none' || !(spacing > 0)) return []
  const segments = []
  for (let y = Math.ceil(minY / spacing) * spacing; y < maxY; y += spacing) segments.push([minX, y, maxX, y])
  if (pattern !== 'grid') return segments
  for (let x = Math.ceil(minX / spacing) * spacing; x < maxX; x += spacing) segments.push([x, minY, x, maxY])
  return segments
}

function tileSvg({ pattern, style }, spacing, color) {
  const edge = LINE_WIDTH / 2
  const dash = paperDash(style, spacing)
  const dashAttr = dash.length ? ` stroke-dasharray="${dash.join(' ')}" stroke-dashoffset="${paperDashOffset(style, spacing)}"` : ''
  const capAttr = style === 'dotted' ? ' stroke-linecap="round"' : ''
  const stroke = `stroke="${color}" stroke-width="${style === 'dotted' ? LINE_WIDTH * 2 : LINE_WIDTH}"${dashAttr}${capAttr}`
  const lines = [`<line x1="0" y1="${edge}" x2="${spacing}" y2="${edge}" ${stroke}/>`]
  if (pattern === 'grid') lines.push(`<line x1="${edge}" y1="0" x2="${edge}" y2="${spacing}" ${stroke}/>`)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spacing} ${spacing}" preserveAspectRatio="none">${lines.join('')}</svg>`
}

export function paperTileImage(paper, { color = PAPER_LINE_COLOR } = {}) {
  const resolved = normalizePaper(paper)
  if (resolved.pattern === 'none') return null
  return `url("data:image/svg+xml,${encodeURIComponent(tileSvg(resolved, TILE_SIZE, color))}")`
}
