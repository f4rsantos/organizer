import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { lowlight } from '@/components/notes/editor/lowlight'
import { MathSolve } from '@/components/notes/editor/extensions/MathSolve'
import { MathGraph } from '@/components/notes/editor/extensions/MathGraph'
import { TaskMention } from '@/components/notes/editor/extensions/TaskMention'

export const SHARED_NOTE_EXTENSIONS = [
  StarterKit.configure({ codeBlock: false }),
  TextStyleKit,
  TableKit.configure({ table: { resizable: true } }),
  TaskList,
  TaskItem.configure({ nested: true }),
  CodeBlockLowlight.configure({ lowlight }),
  TaskMention,
  MathGraph,
  MathSolve,
]

let cachedSchema = null

export function sharedNoteSchema() {
  cachedSchema = cachedSchema ?? getSchema(SHARED_NOTE_EXTENSIONS)
  return cachedSchema
}
