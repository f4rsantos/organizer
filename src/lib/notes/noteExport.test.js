import { describe, it, expect } from 'vitest'
import { docToMarkdown, docToPlainText, docToHtml } from './noteExport.js'
import { markdownToDoc, titleFromMarkdown } from './noteImport.js'

const doc = content => ({ type: 'doc', content })
const para = (...content) => ({ type: 'paragraph', content })
const t = (text, marks) => (marks ? { type: 'text', text, marks } : { type: 'text', text })

describe('markdown export', () => {
  it('writes a paragraph', () => {
    expect(docToMarkdown(doc([para(t('hello'))]))).toBe('hello')
  })

  it('writes a heading', () => {
    expect(docToMarkdown(doc([{ type: 'heading', attrs: { level: 2 }, content: [t('Title')] }]))).toBe('## Title')
  })

  it('drops a javascript href from a link', () => {
    const node = para(t('x', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]))
    expect(docToMarkdown(doc([node]))).toBe('[x]()')
  })

  it('writes bold and italic', () => {
    const node = para(t('a', [{ type: 'bold' }]), t('b', [{ type: 'italic' }]))
    expect(docToMarkdown(doc([node]))).toBe('**a***b*')
  })

  it('writes a link', () => {
    const node = para(t('site', [{ type: 'link', attrs: { href: 'https://x.dev' } }]))
    expect(docToMarkdown(doc([node]))).toBe('[site](https://x.dev)')
  })

  it('writes a bullet list', () => {
    const list = {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [para(t('one'))] }, { type: 'listItem', content: [para(t('two'))] }],
    }
    expect(docToMarkdown(doc([list]))).toBe('- one\n- two')
  })

  it('writes a checklist', () => {
    const list = {
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: true }, content: [para(t('done'))] },
        { type: 'taskItem', attrs: { checked: false }, content: [para(t('todo'))] },
      ],
    }
    expect(docToMarkdown(doc([list]))).toBe('- [x] done\n- [ ] todo')
  })

  it('writes a code block with its language', () => {
    const node = { type: 'codeBlock', attrs: { language: 'python' }, content: [t('x = 1')] }
    expect(docToMarkdown(doc([node]))).toBe('```python\nx = 1\n```')
  })

  it('writes a table', () => {
    const cell = value => ({ type: 'tableCell', content: [para(t(value))] })
    const table = {
      type: 'table',
      content: [
        { type: 'tableRow', content: [cell('a'), cell('b')] },
        { type: 'tableRow', content: [cell('1'), cell('2')] },
      ],
    }
    expect(docToMarkdown(doc([table]))).toBe('| a | b |\n| --- | --- |\n| 1 | 2 |')
  })

  it('writes a graph as its expression', () => {
    expect(docToMarkdown(doc([{ type: 'mathGraph', attrs: { expression: 'x^2' } }]))).toBe('y = x^2')
  })

  it('handles an empty document', () => {
    expect(docToMarkdown(null)).toBe('')
  })
})

describe('plain text export', () => {
  it('strips formatting markers', () => {
    const node = para(t('bold', [{ type: 'bold' }]))
    expect(docToPlainText(doc([node]))).toBe('bold')
  })

  it('strips heading hashes', () => {
    expect(docToPlainText(doc([{ type: 'heading', attrs: { level: 1 }, content: [t('Hi')] }]))).toBe('Hi')
  })

  it('keeps link text only', () => {
    const node = para(t('site', [{ type: 'link', attrs: { href: 'https://x.dev' } }]))
    expect(docToPlainText(doc([node]))).toBe('site')
  })
})

describe('html export', () => {
  it('wraps the title in a heading', () => {
    expect(docToHtml(doc([para(t('body'))]), 'My note')).toContain('<h1>My note</h1>')
  })

  it('escapes html in the content', () => {
    expect(docToHtml(doc([para(t('<script>'))]), 'x')).toContain('&lt;script&gt;')
  })

  it('escapes html in the title', () => {
    expect(docToHtml(doc([]), '<img>')).toContain('&lt;img&gt;')
  })

  it('carries inline colour through', () => {
    const node = para(t('red', [{ type: 'textStyle', attrs: { color: '#ff0000' } }]))
    expect(docToHtml(doc([node]), 'x')).toContain('color:#ff0000')
  })

  it('escapes quotes so an href cannot break out of its attribute', () => {
    const node = para(t('x', [{ type: 'link', attrs: { href: 'https://a.test/"onmouseover="alert(1)' } }]))
    const html = docToHtml(doc([node]), 'x')
    expect(html).not.toContain('onmouseover="alert(1)"')
    expect(html).toContain('&quot;')
  })

  it('drops javascript hrefs', () => {
    const node = para(t('x', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]))
    expect(docToHtml(doc([node]), 'x')).toContain('href=""')
  })

  it('drops a style value that is not a colour', () => {
    const node = para(t('x', [{ type: 'textStyle', attrs: { color: 'red;background:url(javascript:alert(1))' } }]))
    expect(docToHtml(doc([node]), 'x')).not.toContain('javascript')
  })

  it('escapes quotes in the title', () => {
    expect(docToHtml(doc([]), '"><img src=x>')).not.toContain('<img src=x>')
  })
})

describe('markdown import', () => {
  it('reads a paragraph', () => {
    expect(markdownToDoc('hello').content[0]).toEqual(para(t('hello')))
  })

  it('reads a heading level', () => {
    expect(markdownToDoc('### Deep').content[0].attrs.level).toBe(3)
  })

  it('reads bold text', () => {
    expect(markdownToDoc('**loud**').content[0].content[0].marks[0].type).toBe('bold')
  })

  it('reads a link', () => {
    const node = markdownToDoc('[site](https://x.dev)').content[0].content[0]
    expect(node.marks[0].attrs.href).toBe('https://x.dev')
  })

  it('reads a bullet list', () => {
    expect(markdownToDoc('- one\n- two').content[0].type).toBe('bulletList')
  })

  it('reads a checklist with state', () => {
    const list = markdownToDoc('- [x] done\n- [ ] todo').content[0]
    expect(list.type).toBe('taskList')
    expect(list.content.map(i => i.attrs.checked)).toEqual([true, false])
  })

  it('reads an ordered list', () => {
    expect(markdownToDoc('1. one\n2. two').content[0].type).toBe('orderedList')
  })

  it('reads a code block language', () => {
    expect(markdownToDoc('```js\nlet a\n```').content[0].attrs.language).toBe('js')
  })

  it('reads a table', () => {
    const table = markdownToDoc('| a | b |\n| --- | --- |\n| 1 | 2 |').content[0]
    expect(table.type).toBe('table')
    expect(table.content).toHaveLength(2)
  })

  it('reads a blockquote', () => {
    expect(markdownToDoc('> quoted').content[0].type).toBe('blockquote')
  })

  it('reads a horizontal rule', () => {
    expect(markdownToDoc('---').content[0].type).toBe('horizontalRule')
  })

  it('always produces a valid doc', () => {
    expect(markdownToDoc('').content).toHaveLength(1)
  })

  it('handles windows line endings', () => {
    expect(markdownToDoc('a\r\n\r\nb').content).toHaveLength(2)
  })
})

describe('round trip', () => {
  const cases = [
    '# Title',
    'plain paragraph',
    '- one\n- two',
    '- [x] done\n- [ ] todo',
    '1. one\n2. two',
    '> quoted',
    '```js\nlet a = 1\n```',
    '| a | b |\n| --- | --- |\n| 1 | 2 |',
  ]

  cases.forEach(source => {
    it(`preserves ${JSON.stringify(source.slice(0, 24))}`, () => {
      expect(docToMarkdown(markdownToDoc(source))).toBe(source)
    })
  })
})

describe('title extraction', () => {
  it('uses the first heading', () => {
    expect(titleFromMarkdown('# Real title\n\nbody', 'fallback')).toBe('Real title')
  })

  it('falls back when there is no heading', () => {
    expect(titleFromMarkdown('just text', 'fallback')).toBe('fallback')
  })
})
