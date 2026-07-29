import { NodeViewWrapper } from '@tiptap/react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'

export function TaskMentionView({ node }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const setActiveTab = useStore(s => s.setActiveTab)
  const task = useStore(s => s.tasks?.find(tk => tk.id === node.attrs.taskId))

  return (
    <NodeViewWrapper as="span">
      {task ? (
        <span onClick={() => setActiveTab('tasks')}
          className="text-[0.85em] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary cursor-pointer font-medium">
          {task.title}
        </span>
      ) : (
        <span className="text-[0.85em] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground italic">
          {t.notesMentionDeletedTask}
        </span>
      )}
    </NodeViewWrapper>
  )
}
