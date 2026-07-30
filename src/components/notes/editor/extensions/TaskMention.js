import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { TaskMentionView } from '../TaskMentionView'

export const TaskMention = Node.create({
  name: 'taskMention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      taskId: { default: null },
      label: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-task-mention]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-task-mention': '' })]
  },

  renderText({ node }) {
    return node.attrs.label
  },

  addNodeView() {
    return ReactNodeViewRenderer(TaskMentionView)
  },
})
