import { useEffect, useMemo, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { lowlight } from './lowlight'
import { MathSolve } from './extensions/MathSolve'
import { MathGraph } from './extensions/MathGraph'
import { TaskMention } from './extensions/TaskMention'
import { EditorToolbar } from './EditorToolbar'
import { useTaskMention } from './useTaskMention'
import { TaskMentionPopup } from '../TaskMentionPopup'

const SAVE_DEBOUNCE_MS = 400
const EMPTY = []

export function RichNoteEditor({ note }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const updateNote = useStore(s => s.updateNote)
  const mathEnabled = useStore(s => s.settings?.notesMathEnabled ?? false)
  const solveEquations = useStore(s => s.settings?.notesMathSolveEquations ?? true)
  const selectionGraph = useStore(s => s.settings?.notesMathSelectionGraph ?? true)
  const stepByStep = useStore(s => s.settings?.notesMathStepByStep ?? true)
  const tasks = useStore(s => s.tasks ?? EMPTY)
  const saveTimer = useRef(null)
  const pendingSave = useRef(false)

  const extensions = useMemo(() => [
    StarterKit.configure({
      codeBlock: false,
      link: { openOnClick: false, autolink: true, HTMLAttributes: { class: 'text-primary underline' } },
    }),
    TextStyleKit,
    TableKit.configure({ table: { resizable: true } }),
    TaskList,
    TaskItem.configure({ nested: true }),
    CodeBlockLowlight.configure({ lowlight }),
    TaskMention,
    MathGraph,
    ...(mathEnabled ? [MathSolve.configure({ solveEquations, selectionGraph, stepByStep })] : []),
  ], [mathEnabled, solveEquations, selectionGraph, stepByStep])

  const mentionRef = useRef(null)

  const editor = useEditor({
    extensions,
    content: note.doc ?? undefined,
    editorProps: {
      attributes: {
        class: 'tiptap-note focus:outline-none min-h-full',
        'aria-label': t.notesBody,
      },
      handleKeyDown: (_view, event) => mentionRef.current?.handleKeyDown(event) ?? false,
    },
    onUpdate: ({ editor: instance }) => {
      mentionRef.current?.refresh()
      pendingSave.current = true
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        pendingSave.current = false
        updateNote(note.id, { doc: instance.getJSON(), body: instance.getText() })
      }, SAVE_DEBOUNCE_MS)
    },
  }, [note.id, extensions])

  const mention = useTaskMention(editor, tasks)

  useEffect(() => {
    mentionRef.current = mention
  }, [mention])

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  useEffect(() => {
    if (!editor) return
    return () => {
      clearTimeout(saveTimer.current)
      if (!pendingSave.current || editor.isDestroyed) return
      pendingSave.current = false
      updateNote(note.id, { doc: editor.getJSON(), body: editor.getText() })
    }
  }, [editor, note.id, updateNote])

  if (!editor) return null

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <EditorToolbar editor={editor} t={t} lang={lang} />
      <div className="relative min-h-0 flex-1">
        <EditorContent
          editor={editor}
          className="h-full overflow-y-auto rounded-xl bg-secondary/20 p-4 text-sm"
        />
        {mention.mention && (
          <TaskMentionPopup
            tasks={mention.matches}
            activeIndex={mention.activeIndex}
            onSelect={mention.select}
            onHover={mention.setActiveIndex}
            emptyLabel={t.notesMentionNoResults}
            coords={mention.mention.coords}
          />
        )}
      </div>
    </div>
  )
}
