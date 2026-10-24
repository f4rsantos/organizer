import { useState } from 'react'
import { Grid3x3, Rows3, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PillSwitch } from '@/components/common/PillSwitch'
import { cn } from '@/lib/utils'
import { normalizePaper } from '@/lib/notes/paper'

const PATTERN_ICONS = { none: Square, lines: Rows3, grid: Grid3x3 }

export function PaperPicker({ paper, t, onChange }) {
  const [open, setOpen] = useState(false)
  const current = normalizePaper(paper)
  const Icon = PATTERN_ICONS[current.pattern]

  return (
    <div className="relative">
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={t.notesPaper}
        onClick={() => setOpen(v => !v)}>
        <Icon className={cn('h-3.5 w-3.5', current.pattern !== 'none' && 'text-primary')} />
      </Button>
      {open && (
        <div className="absolute left-0 top-8 z-30 w-60 space-y-2 rounded-lg border border-border bg-popover p-2 shadow-md">
          <p className="text-[11px] font-medium text-muted-foreground">{t.notesPaper}</p>
          <PillSwitch
            optionClassName="flex-1 px-2 py-1 text-xs"
            options={[
              { value: 'none', label: t.paperNone },
              { value: 'lines', label: t.paperLines },
              { value: 'grid', label: t.paperGrid },
            ]}
            value={current.pattern}
            onChange={pattern => onChange({ ...current, pattern })}
          />
          {current.pattern !== 'none' && (
            <PillSwitch
              optionClassName="flex-1 px-2 py-1 text-xs"
              options={[
                { value: 'solid', label: t.paperSolid },
                { value: 'dashed', label: t.paperDashed },
                { value: 'dotted', label: t.paperDotted },
              ]}
              value={current.style}
              onChange={style => onChange({ ...current, style })}
            />
          )}
        </div>
      )}
    </div>
  )
}
