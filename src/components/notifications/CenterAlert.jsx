import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function CenterAlert({ alert, dismissLabel, onDismiss }) {
  return (
    <Dialog open={!!alert} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm" showCloseButton={false}>
        {alert && (
          <>
            <DialogHeader>
              <DialogTitle>{alert.title}</DialogTitle>
              {alert.body && <DialogDescription>{alert.body}</DialogDescription>}
            </DialogHeader>
            <DialogFooter>
              <Button onClick={onDismiss}>{dismissLabel}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
