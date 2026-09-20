import { BellRing } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function CenterAlert({ alert, dismissLabel, onDismiss }) {
  return (
    <Dialog open={!!alert} onOpenChange={() => {}}>
      <DialogContent className="max-w-xs items-center gap-4 rounded-2xl p-6 text-center" showCloseButton={false}>
        {alert && (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BellRing className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="text-base font-semibold">{alert.title}</DialogTitle>
              {alert.body && <DialogDescription className="text-sm">{alert.body}</DialogDescription>}
            </div>
            <Button onClick={onDismiss} className="w-full">{dismissLabel}</Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
