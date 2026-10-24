import { useEffect, useMemo, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { NoteTableKit } from './extensions/NoteTable'
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
import { CollabPlugins } from './extensions/CollabPlugins'
import { EditorToolbar } from './EditorToolbar'
import { TableControls } from './TableControls'
import { useTaskMention } from './useTaskMention'
import { TaskMentionPopup } from '../TaskMentionPopup'
import { paperTileImage } from '@/lib/notes/paper'
import { cn } from '@/lib/utils'

const CODE_TAB_SIZE = 2
const PAPER_SURFACE = '[background-image:var(--note-paper)] [background-size:1lh_1lh] [background-position:1rem_1rem] [background-attachment:local]'

const SAVE_DEBOUNCE_MS = 400
const EMPTY = []

export function RichNoteEditor({ note, collabPlugins = null, editable = true }) {
  if (note.sharedMeta?.remote && !collabPlugins) return null
  return <NoteEditorSurface note={note} collabPlugins={collabPlugins} editable={editable} />
}

function NoteEditorSurface({ note, collabPlugins, editable }) {
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
  const savedDocRef = useRef(note.doc)
  const scrollRef = useRef(null)

  const collaborative = Boolean(collabPlugins)

  const extensions = useMemo(() => [
    StarterKit.configure({
      codeBlock: false,
      ...(collaborative ? { undoRedo: false } : {}),
      link: { openOnClick: false, autolink: true, HTMLAttributes: { class: 'text-primary underline' } },
    }),
    TextStyleKit,
    NoteTableKit,
    TaskList,
    TaskItem.configure({ nested: true }),
    CodeBlockLowlight.configure({ lowlight, enableTabIndentation: true, tabSize: CODE_TAB_SIZE }),
    TaskMention,
    MathGraph,
    ...(mathEnabled ? [MathSolve.configure({ solveEquations, selectionGraph, stepByStep })] : []),
    ...(collabPlugins ? [CollabPlugins.configure({ plugins: collabPlugins })] : []),
  ], [mathEnabled, solveEquations, selectionGraph, stepByStep, collaborative, collabPlugins])

  const mentionRef = useRef(null)

  const editor = useEditor({
    extensions,
    editable,
    ...(collaborative ? {} : { content: note.doc ?? undefined }),
    editorProps: {
      attributes: {
        class: 'tiptap-note focus:outline-none min-h-full',
        'aria-label': t.notesBody,
      },
      handleKeyDown: (_view, event) => mentionRef.current?.handleKeyDown(event) ?? false,
    },
    onUpdate: ({ editor: instance }) => {
      mentionRef.current?.refresh()
      if (collaborative) return
      pendingSave.current = true
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        pendingSave.current = false
        const doc = instance.getJSON()
        savedDocRef.current = doc
        updateNote(note.id, { doc, body: instance.getText() })
      }, SAVE_DEBOUNCE_MS)
    },
  }, [note.id, extensions])

  const mention = useTaskMention(editor, tasks)

  useEffect(() => {
    mentionRef.current = mention
  }, [mention])

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setEditable(editable)
  }, [editor, editable])

  useEffect(() => {
    if (!editor || editor.isDestroyed || collaborative) return
    if (note.doc === savedDocRef.current || pendingSave.current) return
    savedDocRef.current = note.doc
    if (JSON.stringify(note.doc ?? null) === JSON.stringify(editor.getJSON())) return
    editor.commands.setContent(note.doc ?? '', { emitUpdate: false })
  }, [editor, note.doc, collaborative])

  useEffect(() => {
    if (!editor || collaborative) return
    return () => {
      clearTimeout(saveTimer.current)
      if (!pendingSave.current || editor.isDestroyed) return
      pendingSave.current = false
      const doc = editor.getJSON()
      savedDocRef.current = doc
      updateNote(note.id, { doc, body: editor.getText() })
    }
  }, [editor, note.id, updateNote, collaborative])

  const paperImage = paperTileImage(note.paper)

  if (!editor) return null

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <EditorToolbar editor={editor} t={t} lang={lang} />
      <div className="relative min-h-0 flex-1">
        <EditorContent
          editor={editor}
          ref={scrollRef}
          style={paperImage ? { '--note-paper': paperImage } : undefined}
          className={cn('h-full overflow-y-auto rounded-xl bg-secondary/20 p-4 text-sm', paperImage && PAPER_SURFACE)}
        />
        <TableControls editor={editor} scrollRef={scrollRef} t={t} />
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
