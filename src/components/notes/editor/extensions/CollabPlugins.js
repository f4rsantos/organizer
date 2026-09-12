import { Extension } from '@tiptap/core'
import { undoCommand, redoCommand } from 'y-prosemirror'

export const CollabPlugins = Extension.create({
  name: 'collabPlugins',

  addOptions() {
    return { plugins: [] }
  },

  addProseMirrorPlugins() {
    return this.options.plugins ?? []
  },

  addCommands() {
    return {
      undo: () => ({ state, dispatch }) => undoCommand(state, dispatch),
      redo: () => ({ state, dispatch }) => redoCommand(state, dispatch),
    }
  },
})
