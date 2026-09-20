import { describe, it, expect } from 'vitest'
import { docToMarkdownForAgent, markdownToDocForAgent, titleForAgent, plainTextForAgent } from '../../../src/lib/ai/markdown.js'

const doc = content => ({ type: 'doc', content })
const para = (...content) => ({ type: 'paragraph', content })
const t = (text, marks) => (marks ? { type: 'text', text, marks } : { type: 'text', text })

describe('doc -> md -> doc fidelity', () => {
  const cases = {
    heading: doc([{ type: 'heading', attrs: { level: 2 }, content: [t('Title')] }]),
    bold: doc([para(t('loud', [{ type: 'bold' }]))]),
    italic: doc([para(t('soft', [{ type: 'italic' }]))]),
    strike: doc([para(t('gone', [{ type: 'strike' }]))]),
    code: doc([para(t('x = 1', [{ type: 'code' }]))]),
    link: doc([para(t('site', [{ type: 'link', attrs: { href: 'https://x.dev' } }]))]),
    blockquote: doc([{ type: 'blockquote', content: [para(t('quoted'))] }]),
    fencedCode: doc([{ type: 'codeBlock', attrs: { language: 'js' }, content: [t('let a = 1')] }]),
    horizontalRule: doc([{ type: 'horizontalRule' }]),
    bulletList: doc([{
      type: 'bulletList',
      content: [{ type: 'listItem', content: [para(t('one'))] }, { type: 'listItem', content: [para(t('two'))] }],
    }]),
    orderedList: doc([{
      type: 'orderedList',
      content: [{ type: 'listItem', content: [para(t('one'))] }, { type: 'listItem', content: [para(t('two'))] }],
    }]),
    taskList: doc([{
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: true }, content: [para(t('done'))] },
        { type: 'taskItem', attrs: { checked: false }, content: [para(t('todo'))] },
      ],
    }]),
    table: doc([{
      type: 'table',
      content: [
        { type: 'tableRow', content: [{ type: 'tableHeader', content: [para(t('a'))] }, { type: 'tableHeader', content: [para(t('b'))] }] },
        { type: 'tableRow', content: [{ type: 'tableCell', content: [para(t('1'))] }, { type: 'tableCell', content: [para(t('2'))] }] },
      ],
    }]),
    nestedBulletList: doc([{
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            para(t('one')),
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    para(t('nested')),
                    { type: 'bulletList', content: [{ type: 'listItem', content: [para(t('deep'))] }] },
                  ],
                },
              ],
            },
          ],
        },
        { type: 'listItem', content: [para(t('two'))] },
      ],
    }]),
  }

  Object.entries(cases).forEach(([name, source]) => {
    it(`round-trips ${name}`, () => {
      const { markdown, sideTable } = docToMarkdownForAgent(source)
      const { doc: result, dropped, invalid } = markdownToDocForAgent(markdown, sideTable)
      expect(result).toEqual(source)
      expect(dropped).toEqual([])
      expect(invalid).toEqual([])
    })
  })
})

describe('custom node placeholders', () => {
  function docWithCustomNodes() {
    return doc([
      para(
        t('See '),
        { type: 'taskMention', attrs: { taskId: 't1', label: 'Buy milk' } },
        t(' please'),
      ),
      { type: 'mathGraph', attrs: { expression: 'x^2', xMin: -5, xMax: 5, height: 200, graphWidth: 0, align: 'center', float: 'none', offsetX: 0 } },
    ])
  }

  it('sends only an opaque token to the model, never the real attrs', () => {
    const { markdown, sideTable } = docToMarkdownForAgent(docWithCustomNodes())
    expect(markdown).not.toContain('Buy milk')
    expect(markdown).not.toContain('x^2')
    expect(markdown).toContain('⟦node:0⟧')
    expect(markdown).toContain('⟦node:1⟧')
    expect(sideTable).toHaveLength(2)
  })

  it('round-trips both custom nodes with attrs intact', () => {
    const source = docWithCustomNodes()
    const { markdown, sideTable } = docToMarkdownForAgent(source)
    const { doc: result, dropped, invalid } = markdownToDocForAgent(markdown, sideTable)
    expect(result).toEqual(source)
    expect(dropped).toEqual([])
    expect(invalid).toEqual([])
  })

  it('treats a dropped placeholder as a real deletion, not a silent restore', () => {
    const source = docWithCustomNodes()
    const { markdown, sideTable } = docToMarkdownForAgent(source)
    const withoutMention = markdown.replace('⟦node:0⟧', '')
    const { doc: result, dropped, invalid } = markdownToDocForAgent(withoutMention, sideTable)
    expect(dropped).toEqual([0])
    expect(invalid).toEqual([])
    expect(JSON.stringify(result)).not.toContain('Buy milk')
    expect(JSON.stringify(result)).toContain('x^2')
  })

  it('reports an invented placeholder without crashing or creating anything', () => {
    const { sideTable } = docToMarkdownForAgent(docWithCustomNodes())
    const markdownWithInvented = 'a made up node ⟦7⟧ wait ⟦node:7⟧ here'
    const { doc: result, dropped, invalid } = markdownToDocForAgent(markdownWithInvented, sideTable)
    expect(invalid).toEqual([7])
    expect(JSON.stringify(result)).not.toContain('node:7')
    expect(dropped).toEqual([0, 1])
  })

  it('resolves a duplicated placeholder once and drops the copy', () => {
    const source = docWithCustomNodes()
    const { markdown, sideTable } = docToMarkdownForAgent(source)
    const duplicated = `${markdown}\n\n⟦node:1⟧`
    const { doc: result } = markdownToDocForAgent(duplicated, sideTable)
    const mathGraphCount = JSON.stringify(result).split('"mathGraph"').length - 1
    expect(mathGraphCount).toBe(1)
  })
})

describe('title and plain text helpers', () => {
  it('extracts the title from the first heading', () => {
    expect(titleForAgent('# Real title\n\nbody', 'fallback')).toBe('Real title')
  })

  it('falls back when no heading is present', () => {
    expect(titleForAgent('just text', 'fallback')).toBe('fallback')
  })

  it('produces plain text without markdown markers', () => {
    expect(plainTextForAgent(doc([para(t('bold', [{ type: 'bold' }]))]))).toBe('bold')
  })
})
