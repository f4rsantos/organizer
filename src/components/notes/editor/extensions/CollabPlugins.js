import { Extension } from '@tiptap/core'

export const CollabPlugins = Extension.create({
  name: 'collabPlugins',

  addOptions() {
    return { plugins: [] }
  },

  addProseMirrorPlugins() {
    return this.options.plugins ?? []
  },
})
