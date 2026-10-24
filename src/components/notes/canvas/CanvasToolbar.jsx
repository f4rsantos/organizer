import { Undo2, Redo2, Trash2, Shapes, Hand } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatShortcut, isMac } from '@/lib/shortcuts'
import { INK } from '@/lib/notes/canvasRender'
import { CANVAS_TOOLS, PEN_TOOLS } from './canvasTools'
import { EraserPopover, PenPopover } from './PenPopover'

const UNDO_SHORTCUT = { key: 'z', code: 'KeyZ', ctrl: !isMac, meta: isMac }
const REDO_SHORTCUT = { ...UNDO_SHORTCUT, shift: true }

function TrayButton({ title, active = false, disabled = false, onClick, children }) {
  return (
    <button type="button" title={title} aria-label={title} aria-pressed={active} disabled={disabled} onClick={onClick}
      className={cn('relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-35',
        active ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-muted')}>
      {children}
    </button>
  )
}

function ToolIcon({ entry, pen }) {
  const Icon = entry.icon
  if (!pen) return <Icon className="h-[18px] w-[18px]" />
  return (
    <>
      <Icon className={cn('h-[18px] w-[18px]', pen.color === INK && 'text-foreground')}
        style={pen.color === INK ? undefined : { color: pen.color }} />
      <span className={cn('absolute bottom-1 h-[3px] w-4 rounded-full', pen.color === INK && 'bg-foreground')}
        style={pen.color === INK ? undefined : { backgroundColor: pen.color }} />
    </>
  )
}

function Divider() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-border" />
}

export function CanvasToolbar({ t, tool, pens, eraser, menuOpen, onTool, onPenChange, onEraserChange, controls }) {
  return (
    <div className="relative mx-auto w-fit max-w-full">
      <div className="flex items-center gap-0.5 overflow-x-auto rounded-xl border border-border bg-popover/95 p-1 shadow-sm backdrop-blur">
        {CANVAS_TOOLS.map(entry => (
          <TrayButton key={entry.id} active={tool === entry.id} onClick={() => onTool(entry.id)}
            title={`${t[entry.labelKey]} (${entry.key.toUpperCase()})`}>
            <ToolIcon entry={entry} pen={PEN_TOOLS.includes(entry.id) ? pens[entry.id] : null} />
          </TrayButton>
        ))}
        <Divider />
        <TrayButton title={t.canvasInkToShape} active={controls.inkToShape} onClick={controls.onToggleInkToShape}>
          <Shapes className="h-[18px] w-[18px]" />
        </TrayButton>
        {controls.stylusSeen && (
          <TrayButton title={t.canvasFingerDraw} active={!controls.stylusOnly} onClick={controls.onToggleStylus}>
            <Hand className="h-[18px] w-[18px]" />
          </TrayButton>
        )}
        <Divider />
        <TrayButton title={`${t.notesUndo} (${formatShortcut(UNDO_SHORTCUT)})`} disabled={!controls.canUndo} onClick={controls.onUndo}>
          <Undo2 className="h-[18px] w-[18px]" />
        </TrayButton>
        <TrayButton title={`${t.notesRedo} (${formatShortcut(REDO_SHORTCUT)})`} disabled={!controls.canRedo} onClick={controls.onRedo}>
          <Redo2 className="h-[18px] w-[18px]" />
        </TrayButton>
        <TrayButton title={controls.hasSelection ? t.canvasDeleteSelection : t.canvasClear}
          disabled={!controls.canClear} onClick={controls.onDelete}>
          <Trash2 className="h-[18px] w-[18px]" />
        </TrayButton>
      </div>
      {menuOpen && PEN_TOOLS.includes(tool) && (
        <PenPopover t={t} pen={pens[tool]} onChange={pen => onPenChange(tool, pen)} />
      )}
      {menuOpen && tool === 'eraser' && <EraserPopover t={t} eraser={eraser} onChange={onEraserChange} />}
    </div>
  )
}
