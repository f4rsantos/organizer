import { Extension } from '@tiptap/core'
import { analyzeLine, analyzeSelection } from '@/lib/notes/mathTrigger'

const EXCLUDED_BLOCKS = new Set(['codeBlock'])

function inExcludedBlock($pos) {
  return !$pos.parent.isTextblock || EXCLUDED_BLOCKS.has($pos.parent.type.name)
}

function currentLine(state) {
  const { $from, empty } = state.selection
  if (!empty || inExcludedBlock($from)) return null
  const text = $from.parent.textBetween(0, $from.parentOffset, '\n', '\n')
  const lineStart = text.lastIndexOf('\n') + 1
  return { text: text.slice(lineStart), from: $from.pos }
}

function currentSelection(state) {
  const { $from, from, to, empty } = state.selection
  if (empty || inExcludedBlock($from)) return null
  return { text: state.doc.textBetween(from, to, '\n', '\n'), from, to }
}

function insertGraph(editor, range, expression) {
  return editor.chain().focus().insertContentAt(range, {
    type: 'mathGraph',
    attrs: { expression },
  }).run()
}

function insertSteps(editor, steps) {
  const chain = editor.chain().focus()
  steps.forEach(step => chain.insertContent({
    type: 'paragraph',
    content: [{ type: 'text', text: `⇔ ${step}` }],
  }))
  return chain.run()
}

export const MathSolve = Extension.create({
  name: 'mathSolve',
  // Must outrank StarterKit's Enter (splitBlock), which is registered first.
  priority: 1000,

  addOptions() {
    return {
      solveEquations: true,
      selectionGraph: true,
      stepByStep: true,
    }
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const selection = currentSelection(editor.state)
        if (selection) {
          if (!this.options.selectionGraph) return false
          const analysis = analyzeSelection(selection.text)
          if (!analysis) return false
          return insertGraph(editor, selection, analysis.source)
        }

        const line = currentLine(editor.state)
        if (!line) return false

        const analysis = analyzeLine(line.text, { solveEquations: this.options.solveEquations })
        if (!analysis) return false

        if (analysis.kind === 'graph') {
          return insertGraph(editor, { from: line.from - line.text.length, to: line.from }, analysis.source)
        }

        if (analysis.kind === 'solution') {
          const steps = this.options.stepByStep ? analysis.steps : [analysis.answer]
          return insertSteps(editor, steps)
        }

        return editor.chain().focus().insertContent(` ${analysis.result}`).run()
      },
    }
  },
})
