const HEADING = /^(#{1,6})\s+(.*)$/
const BULLET = /^\s*[-*+]\s+(.*)$/
const TASK = /^\s*[-*+]\s+\[( |x)\]\s+(.*)$/i
const ORDERED = /^\s*\d+[.)]\s+(.*)$/
const QUOTE = /^>\s?(.*)$/
const RULE = /^\s*([-*_])\1{2,}\s*$/
const FENCE = /^```(\w*)\s*$/
const TABLE_ROW = /^\s*\|(.+)\|\s*$/
const TABLE_DIVIDER = /^\s*\|[\s:|-]+\|\s*$/

const INLINE = [
  { pattern: /\*\*(.+?)\*\*/, mark: 'bold' },
  { pattern: /__(.+?)__/, mark: 'bold' },
  { pattern: /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/, mark: 'italic' },
  { pattern: /_(.+?)_/, mark: 'italic' },
  { pattern: /~~(.+?)~~/, mark: 'strike' },
  { pattern: /`(.+?)`/, mark: 'code' },
]

const LINK = /\[([^\]]*)\]\(([^)]+)\)/

function text(value, marks) {
  const node = { type: 'text', text: value }
  if (marks?.length) node.marks = marks
  return node
}

function parseInline(source, marks = []) {
  if (!source) return []

  const link = source.match(LINK)
  if (link) {
    const before = source.slice(0, link.index)
    const after = source.slice(link.index + link[0].length)
    return [
      ...parseInline(before, marks),
      ...parseInline(link[1], [...marks, { type: 'link', attrs: { href: link[2] } }]),
      ...parseInline(after, marks),
    ]
  }

  for (const { pattern, mark } of INLINE) {
    const match = source.match(pattern)
    if (!match) continue
    const before = source.slice(0, match.index)
    const after = source.slice(match.index + match[0].length)
    return [
      ...parseInline(before, marks),
      ...parseInline(match[1], [...marks, { type: mark }]),
      ...parseInline(after, marks),
    ]
  }

  return [text(source, marks)]
}

function paragraph(source) {
  const content = parseInline(source)
  return content.length ? { type: 'paragraph', content } : { type: 'paragraph' }
}

function tableCells(line) {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(cell => cell.trim())
}

function buildTable(lines, start) {
  const rows = []
  let i = start
  while (i < lines.length && TABLE_ROW.test(lines[i])) {
    if (!TABLE_DIVIDER.test(lines[i])) rows.push(tableCells(lines[i]))
    i += 1
  }
  if (rows.length < 1) return null

  const content = rows.map((cells, rowIndex) => ({
    type: 'tableRow',
    content: cells.map(cell => ({
      type: rowIndex === 0 ? 'tableHeader' : 'tableCell',
      content: [paragraph(cell)],
    })),
  }))

  return { node: { type: 'table', content }, next: i }
}

function buildList(lines, start, kind) {
  const items = []
  let i = start

  while (i < lines.length) {
    const line = lines[i]
    const task = line.match(TASK)
    const bullet = line.match(BULLET)
    const ordered = line.match(ORDERED)

    if (kind === 'taskList' && task) {
      items.push({
        type: 'taskItem',
        attrs: { checked: task[1].toLowerCase() === 'x' },
        content: [paragraph(task[2])],
      })
    } else if (kind === 'bulletList' && bullet && !task) {
      items.push({ type: 'listItem', content: [paragraph(bullet[1])] })
    } else if (kind === 'orderedList' && ordered) {
      items.push({ type: 'listItem', content: [paragraph(ordered[1])] })
    } else {
      break
    }
    i += 1
  }

  if (!items.length) return null
  return { node: { type: kind, content: items }, next: i }
}

export function markdownToDoc(source) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n')
  const content = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) { i += 1; continue }

    const fence = line.match(FENCE)
    if (fence) {
      const body = []
      i += 1
      while (i < lines.length && !/^```/.test(lines[i])) { body.push(lines[i]); i += 1 }
      i += 1
      content.push({
        type: 'codeBlock',
        attrs: fence[1] ? { language: fence[1] } : {},
        ...(body.length ? { content: [text(body.join('\n'))] } : {}),
      })
      continue
    }

    if (RULE.test(line)) { content.push({ type: 'horizontalRule' }); i += 1; continue }

    const heading = line.match(HEADING)
    if (heading) {
      content.push({ type: 'heading', attrs: { level: heading[1].length }, content: parseInline(heading[2]) })
      i += 1
      continue
    }

    if (TABLE_ROW.test(line)) {
      const table = buildTable(lines, i)
      if (table) { content.push(table.node); i = table.next; continue }
    }

    const quote = line.match(QUOTE)
    if (quote) {
      const body = []
      while (i < lines.length && QUOTE.test(lines[i])) { body.push(lines[i].match(QUOTE)[1]); i += 1 }
      content.push({ type: 'blockquote', content: [paragraph(body.join(' '))] })
      continue
    }

    const kind = TASK.test(line) ? 'taskList' : BULLET.test(line) ? 'bulletList' : ORDERED.test(line) ? 'orderedList' : null
    if (kind) {
      const list = buildList(lines, i, kind)
      if (list) { content.push(list.node); i = list.next; continue }
    }

    const body = []
    while (i < lines.length && lines[i].trim() && !HEADING.test(lines[i]) && !BULLET.test(lines[i])
      && !ORDERED.test(lines[i]) && !QUOTE.test(lines[i]) && !RULE.test(lines[i])
      && !FENCE.test(lines[i]) && !TABLE_ROW.test(lines[i])) {
      body.push(lines[i])
      i += 1
    }
    if (body.length) content.push(paragraph(body.join(' ')))
    else i += 1
  }

  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

export function titleFromMarkdown(source, fallback) {
  const heading = String(source ?? '').split('\n').find(line => HEADING.test(line))
  if (heading) return heading.match(HEADING)[2].trim()
  return fallback
}
