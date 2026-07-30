import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { MathGraphView } from '../MathGraphView'

const numberAttribute = (name, fallback) => ({
  default: fallback,
  parseHTML: element => {
    const raw = Number(element.getAttribute(`data-${name}`))
    return Number.isFinite(raw) ? raw : fallback
  },
  renderHTML: attributes => ({ [`data-${name}`]: attributes[name] }),
})

export const MathGraph = Node.create({
  name: 'mathGraph',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      expression: { default: '' },
      xMin: numberAttribute('x-min', -10),
      xMax: numberAttribute('x-max', 10),
      height: numberAttribute('height', 180),
      graphWidth: numberAttribute('graph-width', 0),
      align: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-align') ?? 'center',
        renderHTML: attributes => ({ 'data-align': attributes.align }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-math-graph]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-math-graph': '' })]
  },

  renderText({ node }) {
    return node.attrs.expression
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathGraphView)
  },
})
