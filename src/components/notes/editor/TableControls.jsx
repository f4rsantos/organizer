import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { findTable } from '@tiptap/pm/tables'
import { cn } from '@/lib/utils'
import {
  TABLE_MIN_WIDTH, TABLE_MAX_WIDTH, TABLE_MIN_ROW_HEIGHT, TABLE_MAX_ROW_HEIGHT,
} from './extensions/NoteTable'

function locateActiveTable(editor) {
  const { selection } = editor.state
  const found = findTable(selection.$from)
  if (!found) return null
  const dom = editor.view.nodeDOM(found.pos)
  if (!(dom instanceof HTMLElement)) return null
  const tableEl = dom.tagName === 'TABLE' ? dom : dom.querySelector('table')
  if (!tableEl) return null
  return { pos: found.pos, node: found.node, tableEl }
}

export function TableControls({ editor, scrollRef, t }) {
  const [active, setActive] = useState(null)
  const resizeRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!editor) return

    const update = () => {
      const found = locateActiveTable(editor)
      if (!found) {
        setActive(prev => (prev ? null : prev))
        return
      }
      const scrollEl = scrollRef.current
      if (!scrollEl) return
      const tableRect = found.tableEl.getBoundingClientRect()
      const scrollRect = scrollEl.getBoundingClientRect()
      setActive({
        pos: found.pos,
        rowHeight: found.node.attrs.rowHeight,
        top: tableRect.top - scrollRect.top + scrollEl.scrollTop,
        left: tableRect.left - scrollRect.left + scrollEl.scrollLeft,
        width: tableRect.width,
        height: tableRect.height,
      })
    }

    const schedule = () => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        update()
      })
    }

    editor.on('selectionUpdate', schedule)
    editor.on('transaction', schedule)
    const scrollEl = scrollRef.current
    scrollEl?.addEventListener('scroll', schedule)
    window.addEventListener('resize', schedule)
    schedule()

    return () => {
      editor.off('selectionUpdate', schedule)
      editor.off('transaction', schedule)
      scrollEl?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [editor, scrollRef])

  if (!active) return null

  const appendRow = () => {
    editor.chain().focus().appendRow().run()
  }

  const appendColumn = () => {
    editor.chain().focus().appendColumn().run()
  }

  const startResize = event => {
    event.preventDefault()
    const found = locateActiveTable(editor)
    const cols = found?.tableEl.querySelectorAll(':scope > colgroup > col') ?? []
    const startColWidths = cols.length
      ? Array.from(cols).map(col => col.getBoundingClientRect().width)
      : null
    resizeRef.current = {
      startX: event.clientX,
      startWidth: active.width,
      startRowHeight: active.rowHeight || Math.round(active.height / Math.max(1, countRows(editor, active.pos))),
      startColWidths,
      pos: active.pos,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveResize = event => {
    const state = resizeRef.current
    if (!state) return
    const nextWidth = Math.max(TABLE_MIN_WIDTH, Math.min(TABLE_MAX_WIDTH,
      Math.round(state.startWidth + (event.clientX - state.startX))))
    const scale = nextWidth / state.startWidth
    const nextRowHeight = Math.max(TABLE_MIN_ROW_HEIGHT, Math.min(TABLE_MAX_ROW_HEIGHT,
      Math.round(state.startRowHeight * scale)))

    const { state: editorState } = editor
    const node = editorState.doc.nodeAt(state.pos)
    if (!node || !state.startColWidths) return

    const colwidths = state.startColWidths.map(w => Math.max(20, Math.round(w * scale)))
    const tr = editorState.tr
      .setNodeAttribute(state.pos, 'rowHeight', nextRowHeight)
    applyColumnWidths(tr, editorState.doc, state.pos, colwidths)
    editor.view.dispatch(tr)
  }

  const endResize = event => {
    resizeRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <button
        type="button"
        title={t.notesTableAddRow}
        aria-label={t.notesTableAddRow}
        onClick={appendRow}
        className={cn(
          'pointer-events-auto absolute flex h-5 w-5 -translate-x-1/2 items-center justify-center',
          'rounded-full border border-border/70 bg-card text-muted-foreground shadow-sm',
          'hover:border-primary/50 hover:text-primary',
        )}
        style={{ top: active.top + active.height - 10, left: active.left + active.width / 2 }}
      >
        <Plus className="h-3 w-3" />
      </button>

      <button
        type="button"
        title={t.notesTableAddColumn}
        aria-label={t.notesTableAddColumn}
        onClick={appendColumn}
        className={cn(
          'pointer-events-auto absolute flex h-5 w-5 -translate-y-1/2 items-center justify-center',
          'rounded-full border border-border/70 bg-card text-muted-foreground shadow-sm',
          'hover:border-primary/50 hover:text-primary',
        )}
        style={{ top: active.top + active.height / 2, left: active.left + active.width - 10 }}
      >
        <Plus className="h-3 w-3" />
      </button>

      <div
        role="separator"
        aria-label={t.notesTableResize}
        title={t.notesTableResize}
        onPointerDown={startResize}
        onPointerMove={moveResize}
        onPointerUp={endResize}
        onPointerCancel={endResize}
        className="pointer-events-auto absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize touch-none rounded-full border border-border/70 bg-card shadow-sm hover:border-primary/50"
        style={{ top: active.top + active.height, left: active.left + active.width }}
      />
    </div>
  )
}

function countRows(editor, pos) {
  const node = editor.state.doc.nodeAt(pos)
  return node ? node.childCount : 1
}

function applyColumnWidths(tr, doc, tablePos, colwidths) {
  if (!colwidths?.length) return
  const table = doc.nodeAt(tablePos)
  table.forEach((row, rowOffset) => {
    let cellIndex = 0
    row.forEach((cell, cellOffset) => {
      const colspan = cell.attrs.colspan ?? 1
      const slice = colwidths.slice(cellIndex, cellIndex + colspan)
      cellIndex += colspan
      if (slice.length) {
        const pos = tablePos + 1 + rowOffset + 1 + cellOffset
        tr.setNodeAttribute(pos, 'colwidth', slice)
      }
    })
  })
}
