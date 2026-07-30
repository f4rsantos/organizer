import { useCallback, useMemo, useState } from 'react'

const MAX_MATCHES = 8

export function findMentionQuery(text) {
  const at = text.lastIndexOf('@')
  if (at === -1) return null
  const before = text[at - 1]
  if (before && !/\s/.test(before)) return null
  const between = text.slice(at + 1)
  if (/\s/.test(between) || between.includes('@')) return null
  return { length: between.length + 1, query: between }
}

function mentionCoords(editor, pos) {
  try {
    const anchor = editor.view.dom.offsetParent ?? editor.view.dom
    const box = anchor.getBoundingClientRect()
    const at = editor.view.coordsAtPos(pos)
    return { left: at.left - box.left, top: at.top - box.top }
  } catch {
    return null
  }
}

export function useTaskMention(editor, tasks) {
  const [mention, setMention] = useState(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const matches = useMemo(() => {
    if (!mention) return []
    const q = mention.query.trim().toLowerCase()
    const pool = q ? tasks.filter(tk => tk.title?.toLowerCase().includes(q)) : tasks
    return pool.slice(0, MAX_MATCHES)
  }, [mention, tasks])

  const close = useCallback(() => setMention(null), [])

  const refresh = useCallback(() => {
    if (!editor) return
    const { $from, empty, from } = editor.state.selection
    if (!empty || !$from.parent.isTextblock) return setMention(null)
    const found = findMentionQuery($from.parent.textBetween(0, $from.parentOffset, '\n', '\n'))
    setMention(found && { ...found, coords: mentionCoords(editor, from - found.length) })
    setActiveIndex(0)
  }, [editor])

  const select = useCallback(task => {
    if (!editor || !mention) return
    const to = editor.state.selection.from
    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: to - mention.length, to },
        [{ type: 'taskMention', attrs: { taskId: task.id, label: task.title } }, { type: 'text', text: ' ' }],
      )
      .run()
    setMention(null)
  }, [editor, mention])

  const handleKeyDown = useCallback(event => {
    if (!mention || matches.length === 0) return false
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(i => (i + 1) % matches.length)
      return true
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(i => (i - 1 + matches.length) % matches.length)
      return true
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      select(matches[activeIndex])
      return true
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setMention(null)
      return true
    }
    return false
  }, [mention, matches, activeIndex, select])

  return { mention, matches, activeIndex, setActiveIndex, refresh, close, select, handleKeyDown }
}
