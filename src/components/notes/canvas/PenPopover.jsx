import { cn } from '@/lib/utils'
import { INK } from '@/lib/notes/canvasRender'
import { PillSwitch } from '@/components/common/PillSwitch'
import { CANVAS_PALETTE, CANVAS_SIZES, ERASER_MODES, ERASER_SIZES } from './canvasTools'

const POPOVER = 'absolute left-1/2 top-12 z-30 w-64 -translate-x-1/2 space-y-3 rounded-xl border border-border bg-popover p-3 shadow-lg'
const PICKER_INPUT = 'absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 opacity-0'

function Swatch({ color, active, label, onPick }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={() => onPick(color)}
      style={color === INK ? undefined : { backgroundColor: color }}
      className={cn('h-7 w-7 rounded-full ring-offset-2 ring-offset-popover transition-transform hover:scale-110',
        color === INK && 'bg-foreground', active && 'ring-2 ring-primary')} />
  )
}

function CustomSwatch({ t, color, onPick }) {
  const custom = !CANVAS_PALETTE.includes(color)
  return (
    <span title={t.canvasCustomColor}
      style={{ backgroundColor: custom ? color : 'transparent' }}
      className={cn('relative inline-flex h-7 w-7 overflow-hidden rounded-full border-2 border-dashed border-border transition-colors hover:border-primary',
        custom && 'ring-2 ring-primary ring-offset-2 ring-offset-popover')}>
      <input type="color" aria-label={t.canvasCustomColor} value={custom ? color : '#000000'}
        onChange={e => onPick(e.target.value)} className={PICKER_INPUT} />
    </span>
  )
}

function SizeRow({ sizes, value, onPick, renderDot }) {
  return (
    <div className="flex items-center justify-between">
      {sizes.map(size => (
        <button key={size} type="button" aria-label={String(size)} onClick={() => onPick(size)}
          className={cn('flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted',
            value === size && 'bg-muted ring-1 ring-primary')}>
          {renderDot(size)}
        </button>
      ))}
    </div>
  )
}

export function PenPopover({ t, pen, onChange }) {
  return (
    <div className={POPOVER}>
      <div className="grid grid-cols-7 gap-2">
        {CANVAS_PALETTE.map(color => (
          <Swatch key={color} color={color} active={pen.color === color}
            label={color === INK ? t.canvasInk : color} onPick={next => onChange({ ...pen, color: next })} />
        ))}
        <CustomSwatch t={t} color={pen.color} onPick={next => onChange({ ...pen, color: next })} />
      </div>
      <SizeRow sizes={CANVAS_SIZES} value={pen.width} onPick={width => onChange({ ...pen, width })}
        renderDot={size => (
          <span className={cn('rounded-full', pen.color === INK && 'bg-foreground')}
            style={{ width: size + 2, height: size + 2, backgroundColor: pen.color === INK ? undefined : pen.color }} />
        )} />
    </div>
  )
}

export function EraserPopover({ t, eraser, onChange }) {
  return (
    <div className={POPOVER}>
      <PillSwitch optionClassName="px-2 py-1 text-xs"
        options={ERASER_MODES.map(mode => ({ value: mode, label: t[mode === 'stroke' ? 'canvasEraseStrokes' : 'canvasErasePartial'] }))}
        value={eraser.mode} onChange={mode => onChange({ ...eraser, mode })} />
      <SizeRow sizes={ERASER_SIZES} value={eraser.radius} onPick={radius => onChange({ ...eraser, radius })}
        renderDot={size => <span className="rounded-full border border-foreground/60" style={{ width: size * 1.2, height: size * 1.2 }} />} />
    </div>
  )
}
