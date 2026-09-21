import { docToMarkdown, docToPlainText } from '@/lib/notes/noteExport.js'
import { markdownToDoc, titleFromMarkdown } from '@/lib/notes/noteImport.js'

const PLACEHOLDER_NODE_TYPES = ['taskMention', 'mathGraph']
const PLACEHOLDER_PREFIX = '⟦node:'
const PLACEHOLDER_SUFFIX = '⟧'
const PLACEHOLDER_PATTERN = /⟦node:(\d+)⟧/g

function isPlaceholderNode(node) {
  return PLACEHOLDER_NODE_TYPES.includes(node?.type)
}

function placeholderToken(index) {
  return `${PLACEHOLDER_PREFIX}${index}${PLACEHOLDER_SUFFIX}`
}

function placeholderTextNode(index) {
  return { type: 'text', text: placeholderToken(index) }
}

function extractPlaceholders(doc) {
  const sideTable = []

  function walk(node) {
    if (!node || typeof node !== 'object') return node

    if (isPlaceholderNode(node)) {
      const index = sideTable.length
      sideTable.push(node)
      return node.type === 'taskMention' ? placeholderTextNode(index) : { type: 'paragraph', content: [placeholderTextNode(index)] }
    }

    if (!Array.isArray(node.content)) return node

    return { ...node, content: node.content.map(walk) }
  }

  const replaced = walk(doc)
  return { doc: replaced, sideTable }
}

function resolvePlaceholders(markdown, sideTable) {
  const seen = new Set()
  const dropped = []
  const invalid = []

  const resolvedMarkdown = markdown.replace(PLACEHOLDER_PATTERN, (match, indexText) => {
    const index = Number(indexText)
    const node = sideTable[index]

    if (!node) {
      invalid.push(index)
      return ''
    }

    if (seen.has(index)) return ''
    seen.add(index)
    return match
  })

  sideTable.forEach((node, index) => {
    if (!seen.has(index)) dropped.push(index)
  })

  return { markdown: resolvedMarkdown, dropped, invalid }
}

function reinsertPlaceholders(doc, sideTable) {
  function walk(node) {
    if (!node || typeof node !== 'object') return node

    if (node.type === 'text' && typeof node.text === 'string' && node.text.includes(PLACEHOLDER_PREFIX)) {
      return expandTextNode(node)
    }

    if (!Array.isArray(node.content)) return node

    return { ...node, content: node.content.flatMap(walk) }
  }

  function expandTextNode(node) {
    const parts = []
    let lastIndex = 0
    let match

    PLACEHOLDER_PATTERN.lastIndex = 0
    while ((match = PLACEHOLDER_PATTERN.exec(node.text)) !== null) {
      const before = node.text.slice(lastIndex, match.index)
      if (before) parts.push({ type: 'text', text: before, ...(node.marks ? { marks: node.marks } : {}) })

      const index = Number(match[1])
      const original = sideTable[index]
      if (original) parts.push(original)

      lastIndex = match.index + match[0].length
    }

    const after = node.text.slice(lastIndex)
    if (after) parts.push({ type: 'text', text: after, ...(node.marks ? { marks: node.marks } : {}) })

    return parts.length ? parts : [{ type: 'text', text: '' }]
  }

  return walk(doc)
}

function unwrapStandaloneBlockPlaceholders(doc) {
  function walk(node) {
    if (!node || typeof node !== 'object' || !Array.isArray(node.content)) return node

    const content = node.content.flatMap(child => {
      const walked = walk(child)
      if (walked?.type !== 'paragraph') return [walked]

      const only = walked.content?.length === 1 ? walked.content[0] : null
      if (only?.type === 'mathGraph') return [only]
      return [walked]
    })

    return { ...node, content }
  }

  return walk(doc)
}

export function docToMarkdownForAgent(docJSON) {
  const { doc, sideTable } = extractPlaceholders(docJSON)
  return { markdown: docToMarkdown(doc), sideTable }
}

export function markdownToDocForAgent(markdown, sideTable = []) {
  const { markdown: resolvedMarkdown, dropped, invalid } = resolvePlaceholders(markdown, sideTable)
  const placeholderDoc = markdownToDoc(resolvedMarkdown)
  const withNodes = reinsertPlaceholders(placeholderDoc, sideTable)
  const doc = unwrapStandaloneBlockPlaceholders(withNodes)
  return { doc, dropped, invalid }
}

export function plainTextForAgent(docJSON) {
  return docToPlainText(docJSON)
}

export function titleForAgent(markdown, fallback) {
  return titleFromMarkdown(markdown, fallback)
}
