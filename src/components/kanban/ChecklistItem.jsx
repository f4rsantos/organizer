import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function ChecklistItem({ item, onChange, onDelete }) {
  return (
    <div className="flex items-center gap-2 group">
      <Checkbox checked={item.done} onCheckedChange={done => onChange({ ...item, done })} />
      <Input value={item.text} onChange={e => onChange({ ...item, text: e.target.value })}
        className="flex-1 h-7 text-sm border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        onClick={onDelete}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}
