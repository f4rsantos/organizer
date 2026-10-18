import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function FloatingAddButton({ onClick, label, className }) {
  return (
    <Button size="icon" aria-label={label} onClick={onClick}
      className={cn('h-12 w-12 rounded-full transition-transform hover:scale-105 active:scale-95', className)}>
      <Plus className="h-5 w-5" />
    </Button>
  )
}
