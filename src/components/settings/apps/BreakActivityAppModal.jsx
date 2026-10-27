import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { BreakActivitySettings } from '../BreakActivitySettings'

export function BreakActivityAppModal({ open, onOpenChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.breakActivity}</DialogTitle>
        </DialogHeader>
        <BreakActivitySettings />
      </DialogContent>
    </Dialog>
  )
}
