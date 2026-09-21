import { Extension } from '@tiptap/core'
import { Table as TiptapTable, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { addColumn, addRow, selectedRect, CellSelection } from '@tiptap/pm/tables'

export const TABLE_MIN_WIDTH = 120
export const TABLE_MAX_WIDTH = 1400
export const TABLE_MIN_ROW_HEIGHT = 24
export const TABLE_MAX_ROW_HEIGHT = 160

export const Table = TiptapTable.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      rowHeight: {
        default: null,
        parseHTML: element => {
          const raw = Number(element.getAttribute('data-row-height'))
          return Number.isFinite(raw) && raw > 0 ? raw : null
        },
        renderHTML: attributes => (
          attributes.rowHeight
            ? { 'data-row-height': attributes.rowHeight, style: `--note-table-row-height: ${attributes.rowHeight}px` }
            : {}
        ),
      },
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      appendRow: () => ({ state, dispatch }) => {
        const rect = selectedRect(state)
        const tr = addRow(state.tr, rect, rect.bottom)
        if (dispatch) dispatch(tr)
        return true
      },
      appendColumn: () => ({ state, dispatch }) => {
        const rect = selectedRect(state)
        const tr = addColumn(state.tr, rect, rect.right)
        if (dispatch) dispatch(tr)
        return true
      },
      setTableRowHeight: rowHeight => ({ state, dispatch }) => {
        const rect = selectedRect(state)
        if (dispatch) {
          dispatch(state.tr.setNodeAttribute(rect.tableStart - 1, 'rowHeight', rowHeight))
        }
        return true
      },
    }
  },

  addKeyboardShortcuts() {
    const parentShortcuts = this.parent?.() ?? {}
    const parentBackspace = parentShortcuts.Backspace
    return {
      ...parentShortcuts,
      Backspace: (...args) => {
        const { selection } = this.editor.state
        if (selection instanceof CellSelection) {
          if (selection.isRowSelection() && !selection.isColSelection()) {
            return this.editor.commands.deleteRow()
          }
          if (selection.isColSelection() && !selection.isRowSelection()) {
            return this.editor.commands.deleteColumn()
          }
        }
        return parentBackspace ? parentBackspace(...args) : false
      },
    }
  },
})

export const NoteTableKit = Extension.create({
  name: 'noteTableKit',
  addExtensions() {
    return [
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ]
  },
})
