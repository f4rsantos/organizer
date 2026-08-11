const MIME = {
  md: 'text/markdown',
  txt: 'text/plain',
  html: 'text/html',
  doc: 'application/msword',
}

function safeFileName(title) {
  const base = String(title ?? '').trim() || 'note'
  return base.replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80)
}

function download(content, fileName, mime) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const SAFE_HREF_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']

function safeHref(href) {
  const trimmed = String(href ?? '').trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return trimmed
  try {
    return SAFE_HREF_PROTOCOLS.includes(new URL(trimmed).protocol) ? trimmed : ''
  } catch {
    return ''
  }
}

const SAFE_COLOR = /^#[0-9a-f]{3,8}$|^rgba?\([\d\s.,%]+\)$/i
const SAFE_FONT_SIZE = /^[\d.]+(px|rem|em|%)$/

function safeStyleValue(value, pattern) {
  const trimmed = String(value ?? '').trim()
  return pattern.test(trimmed) ? trimmed : ''
}

function marksToMarkdown(text, marks = []) {
  let out = text
  for (const mark of marks) {
    if (mark.type === 'bold') out = `**${out}**`
    else if (mark.type === 'italic') out = `*${out}*`
    else if (mark.type === 'strike') out = `~~${out}~~`
    else if (mark.type === 'code') out = `\`${out}\``
    else if (mark.type === 'link') out = `[${out}](${safeHref(mark.attrs?.href)})`
  }
  return out
}

function inlineToMarkdown(nodes = []) {
  return nodes.map(node => {
    if (node.type === 'text') return marksToMarkdown(node.text ?? '', node.marks)
    if (node.type === 'taskMention') return node.attrs?.label ?? ''
    if (node.type === 'hardBreak') return '\n'
    return ''
  }).join('')
}

function rowToMarkdown(row) {
  const cells = (row.content ?? []).map(cell => inlineToMarkdown(
    (cell.content ?? []).flatMap(block => block.content ?? []),
  ).replace(/\|/g, '\\|'))
  return `| ${cells.join(' | ')} |`
}

function blockToMarkdown(node, depth = 0) {
  const indent = '  '.repeat(depth)

  switch (node.type) {
    case 'paragraph':
      return inlineToMarkdown(node.content)
    case 'heading':
      return `${'#'.repeat(node.attrs?.level ?? 1)} ${inlineToMarkdown(node.content)}`
    case 'blockquote':
      return (node.content ?? []).map(child => `> ${blockToMarkdown(child, depth)}`).join('\n')
    case 'codeBlock':
      return `\`\`\`${node.attrs?.language ?? ''}\n${inlineToMarkdown(node.content)}\n\`\`\``
    case 'horizontalRule':
      return '---'
    case 'bulletList':
      return (node.content ?? [])
        .map(item => `${indent}- ${listItemToMarkdown(item, depth)}`).join('\n')
    case 'orderedList':
      return (node.content ?? [])
        .map((item, i) => `${indent}${i + 1}. ${listItemToMarkdown(item, depth)}`).join('\n')
    case 'taskList':
      return (node.content ?? []).map(item => {
        const box = item.attrs?.checked ? '[x]' : '[ ]'
        return `${indent}- ${box} ${listItemToMarkdown(item, depth)}`
      }).join('\n')
    case 'table': {
      const rows = node.content ?? []
      if (!rows.length) return ''
      const header = rowToMarkdown(rows[0])
      const columns = (rows[0].content ?? []).length
      const divider = `| ${Array(columns).fill('---').join(' | ')} |`
      return [header, divider, ...rows.slice(1).map(rowToMarkdown)].join('\n')
    }
    case 'mathGraph':
      return `y = ${node.attrs?.expression ?? ''}`
    default:
      return inlineToMarkdown(node.content)
  }
}

function listItemToMarkdown(item, depth) {
  const blocks = item.content ?? []
  const [first, ...rest] = blocks
  const head = first ? blockToMarkdown(first, depth) : ''
  const tail = rest.map(child => `\n${blockToMarkdown(child, depth + 1)}`).join('')
  return head + tail
}

export function docToMarkdown(doc) {
  if (!doc?.content) return ''
  return doc.content.map(node => blockToMarkdown(node)).join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function docToPlainText(doc) {
  return docToMarkdown(doc)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
}

function inlineToHtml(nodes = []) {
  return nodes.map(node => {
    if (node.type === 'taskMention') return escapeHtml(node.attrs?.label ?? '')
    if (node.type === 'hardBreak') return '<br />'
    if (node.type !== 'text') return ''

    let out = escapeHtml(node.text ?? '')
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') out = `<strong>${out}</strong>`
      else if (mark.type === 'italic') out = `<em>${out}</em>`
      else if (mark.type === 'strike') out = `<s>${out}</s>`
      else if (mark.type === 'code') out = `<code>${out}</code>`
      else if (mark.type === 'link') out = `<a href="${escapeHtml(safeHref(mark.attrs?.href))}">${out}</a>`
      else if (mark.type === 'textStyle') {
        const color = safeStyleValue(mark.attrs?.color, SAFE_COLOR)
        const fontSize = safeStyleValue(mark.attrs?.fontSize, SAFE_FONT_SIZE)
        const style = [
          color ? `color:${color}` : '',
          fontSize ? `font-size:${fontSize}` : '',
        ].filter(Boolean).join(';')
        if (style) out = `<span style="${style}">${out}</span>`
      }
    }
    return out
  }).join('')
}

function blockToHtml(node) {
  switch (node.type) {
    case 'paragraph':
      return `<p>${inlineToHtml(node.content) || '&nbsp;'}</p>`
    case 'heading':
      return `<h${node.attrs?.level ?? 1}>${inlineToHtml(node.content)}</h${node.attrs?.level ?? 1}>`
    case 'blockquote':
      return `<blockquote>${(node.content ?? []).map(blockToHtml).join('')}</blockquote>`
    case 'codeBlock':
      return `<pre><code>${escapeHtml(inlineToHtml(node.content))}</code></pre>`
    case 'horizontalRule':
      return '<hr />'
    case 'bulletList':
      return `<ul>${(node.content ?? []).map(item => `<li>${(item.content ?? []).map(blockToHtml).join('')}</li>`).join('')}</ul>`
    case 'orderedList':
      return `<ol>${(node.content ?? []).map(item => `<li>${(item.content ?? []).map(blockToHtml).join('')}</li>`).join('')}</ol>`
    case 'taskList':
      return `<ul style="list-style:none;padding-left:0">${(node.content ?? []).map(item =>
        `<li>${item.attrs?.checked ? '☑' : '☐'} ${(item.content ?? []).map(blockToHtml).join('')}</li>`).join('')}</ul>`
    case 'table':
      return `<table border="1" style="border-collapse:collapse">${(node.content ?? []).map(row =>
        `<tr>${(row.content ?? []).map(cell => {
          const tag = cell.type === 'tableHeader' ? 'th' : 'td'
          return `<${tag} style="padding:4px 8px">${(cell.content ?? []).map(blockToHtml).join('')}</${tag}>`
        }).join('')}</tr>`).join('')}</table>`
    case 'mathGraph':
      return `<p><em>y = ${escapeHtml(node.attrs?.expression ?? '')}</em></p>`
    default:
      return `<p>${inlineToHtml(node.content)}</p>`
  }
}

export function docToHtml(doc, title) {
  const body = (doc?.content ?? []).map(blockToHtml).join('\n')
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(title ?? '')}</title>`
    + `<style>body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.6;max-width:46rem;margin:2rem auto;padding:0 1rem}`
    + `pre{background:#f4f4f5;padding:.75rem;border-radius:.5rem;overflow-x:auto}`
    + `code{font-family:ui-monospace,monospace}blockquote{border-left:3px solid #d4d4d8;margin:0;padding-left:1rem;color:#52525b}`
    + `table{width:100%}th{background:#f4f4f5;text-align:left}</style></head>`
    + `<body><h1>${escapeHtml(title ?? '')}</h1>\n${body}</body></html>`
}

export function exportNote(note, format) {
  const name = safeFileName(note.title)
  const doc = note.doc

  if (format === 'md') return download(docToMarkdown(doc), `${name}.md`, MIME.md)
  if (format === 'txt') return download(docToPlainText(doc), `${name}.txt`, MIME.txt)
  if (format === 'html') return download(docToHtml(doc, note.title), `${name}.html`, MIME.html)
  if (format === 'doc') return download(docToHtml(doc, note.title), `${name}.doc`, MIME.doc)
  if (format === 'pdf') return printAsPdf(docToHtml(doc, note.title))
  return null
}

// Uses the browser's own print-to-PDF: no dependency, and the output matches
// whatever the user's system PDF engine produces.
export function printAsPdf(html) {
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(frame)

  frame.onload = () => {
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
    setTimeout(() => frame.remove(), 1000)
  }

  frame.srcdoc = html
}
