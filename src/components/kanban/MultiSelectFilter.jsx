import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { ALL_VALUE, resolveMultiSelection } from '@/lib/multiSelectFilter'
import { cn } from '@/lib/utils'

export function MultiSelectFilter({ value, onValueChange, icon: Icon, label, className, children }) {
  return (
    <Select
      multiple
      value={value}
      onValueChange={next => onValueChange(resolveMultiSelection(value, next))}
    >
      <SelectTrigger
        className={cn(
          '!h-7 text-xs w-auto min-w-0 max-w-[45vw] sm:max-w-none bg-secondary/30 gap-1',
          className,
        )}
      >
        {Icon && <Icon className="h-3 w-3 text-muted-foreground shrink-0" />}
        <span className="truncate">{label}</span>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>{children}</SelectContent>
    </Select>
  )
}

export function MultiSelectItem(props) {
  return <SelectItem {...props} />
}

export { ALL_VALUE }
