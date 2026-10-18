import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { PomodoroSettings } from '../PomodoroSettings'

export function PomodoroAppModal({ open, onOpenChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.pomodoro}</DialogTitle>
        </DialogHeader>
        <PomodoroSettings />
      </DialogContent>
    </Dialog>
  )
}
