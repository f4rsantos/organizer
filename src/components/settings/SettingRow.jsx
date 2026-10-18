import { ChevronRight } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export function SettingList({ children, className }) {
  return <div className={cn('divide-y divide-border/60', className)}>{children}</div>
}

function RowText({ label, desc }) {
  return (
    <div className="min-w-[11rem] flex-1">
      <p className="text-sm font-medium leading-snug">{label}</p>
      {desc && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>}
    </div>
  )
}

export function SettingRow({ label, desc, control, children, className }) {
  return (
    <div className={cn('py-3', className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <RowText label={label} desc={desc} />
        {control && <div className="ml-auto flex max-w-full items-center gap-2">{control}</div>}
      </div>
      {children && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  )
}

export function SettingToggle({ label, desc, checked, onChange, children }) {
  return (
    <div className="py-3">
      <label className="flex cursor-pointer items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{label}</p>
          {desc && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>}
        </div>
        <Switch checked={checked} onCheckedChange={onChange} className="shrink-0" />
      </label>
      {children && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  )
}

export function SettingSelect({ label, desc, value, onChange, options }) {
  return (
    <SettingRow label={label} desc={desc} control={
      <Select value={value} onValueChange={onChange} items={options}>
        <SelectTrigger className="h-8 w-auto max-w-full gap-2 whitespace-nowrap">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false} sideOffset={4}>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    } />
  )
}

export function SettingLink({ label, desc, value, icon: Icon = ChevronRight, onClick }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-4 py-3 text-left">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{label}</p>
        {desc && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>}
      </div>
      {value && <span className="shrink-0 text-xs text-muted-foreground">{value}</span>}
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}
